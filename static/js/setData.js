define(["jquery", "config", "js/infoTip", "js/command"], function($, config, infoTip, command) {
	// 用来记录上次的分组信息--内部使用
	var oldData =  "";
	var logLevels = ['error', 'warn', 'info', 'verbose', 'debug', 'silly'];
	var result = {
		// 表示与后端同步的分组信息
		data: {
			host: []
		},
		// 折叠信息，这个存储在本地localstroage中
		// 为键值对 健是  groupName，true表示折叠，没有表示 不折叠
		foldInfo: {},
		// 找到一个分组
		findGroup: function(groupName) {
			var retVal = null,
				setData = this.data;
			if (setData.host && setData.host.length && groupName) {
				$.each(setData.host, function(i, group) {
					if (group.groupName && group.groupName == groupName) {
						retVal = {
							group: group,
							index: i
						};
						return false;
					}
				});
			}
			return retVal;
		},
		// 找到一个分支
		findBranch: function(groupName, branchName) {
			var retVal = null,
				tmp, group;
			if (groupName && branchName) {
				tmp = this.findGroup(groupName);
				if (tmp) {
					group = tmp.group;
					if (group && group.branches && group.branches.length) {
						$.each(group.branches, function(j, branch) {
							if (branch.branchName && branch.branchName == branchName) {
								retVal = {
									group: group,
									branch: branch,
									index: j
								};
								return false;
							}
						});
					}
				}
			}
			return retVal;
		},
		//	设置日志级别
		setLogLevel: function(level) {
			if (logLevels.some(function(cur) {return level === cur;})) {
				this.data.logLevel = level;
				this.save();
			}
		},
		// 设置目录访问
		setVisitDir: function(status) {
			this.data.isVisitDir = !!status; 
		},
		// 设置是否自动代理
		setAutoProxy: function(status) {
			this.data.autoProxy = !!status; 
		},
		// 保存数据
		save: function() {
			var data = this.data;
			var strData = JSON.stringify(data);
			var oldstrData = oldData;
			var com = this;
			// 如果数据完全一样，就证明根本没有改配置
			if (strData === oldstrData) {
				return;
			};
			$.post(config.baseUrl + '/sys/set_config_ajax.html', {
				data: strData
			})
			.then(function(status) {
				status = +status;
				if (status === 1) {
					$('.content-col .form-wrap[data-branch-name][data-group-name]:visible')
					.each(function() {
						var me = $(this),
							groupName = me.attr('data-group-name'),
							branchName = me.attr('data-branch-name');
						if (groupName && branchName) {
							// 检测当前分支的btn是否更新
							command.setCommandBtn(groupName, branchName);
						}
					});
					if (data.runCmd) {
						command.saveCheckCommand();
					}
					// 更新缓存数据
					oldData = strData;
					// 保存的时候需要将无用的 fold信息删除掉
					// 主要是点击删除的时候，如果本地存储中有这条数据同时也要删除
					var host = data.host, key;
					var testInfo =  {};
					for(key in com.foldInfo) {
						testInfo[key] = false;
					}
					if (host.length) {
						$.each(host, function(i, current) {
							// 如果存在这个键
							if (testInfo[current.groupName] === false) {
								testInfo[current.groupName] = true;
							}
						});
						for(key in testInfo) {
							if (testInfo[key] === false) {
								delete testInfo[key];
							}
						}
						com.foldInfo = testInfo;
						setJSONToLS('foldInfo', com.foldInfo);
					}
					infoTip.alertTip("服务器配置更新成功", 500);
				} else {
					infoTip.wrongToast("服务器配置失败");
				}
			}, function() {
				infoTip.wrongToast("系统忙，请稍后在试试");
			});
		},
		// 设置折叠信息，
		// 只记折叠住的，不折叠的不记住
		// 发生改变立马同步本地存储
		setFoldInfo: function(groupName, isFlod) {
			if (groupName) {
				if (isFlod === true) {
					this.foldInfo[groupName] = true;
				} else {
					if (this.foldInfo[groupName]) {
						delete this.foldInfo[groupName];
					}
				}
				setJSONToLS('foldInfo', this.foldInfo);
			}
		},
		getFoldInfo: function(groupName) {
			return !!this.foldInfo[groupName];		
		}
	};
	// 将一个json值放入LS中
	var setJSONToLS = function(key, data) {
		try {
			localStorage.setItem(key, JSON.stringify(data));
		} catch(e) {
		}
	};
	// 获取折叠信息
	var initFoldInfo = function() {
		var info = localStorage.getItem('foldInfo');
		if (info) {
			try {
				info = JSON.parse(info);
			} catch(e) {
				info = {};
			}
			result.foldInfo = info;
		}
	};
	return (function(result) {
		var def = $.Deferred();
		$.ajax(config.baseUrl + "/sys/get_config_ajax.html",  {
			cache: false,
			complete: function(data, error) {
				if (error === 'error') {
					result.data = {
						host: []
					};
				} else {
					try {
						if (data.responseJSON) {
							result.data = data.responseJSON;
							result.data.host = result.data.host || [];
						}
					} catch (e) {
						console.error("从服务器获取数据后解析错误");
						result.data = {
							host: []
						};
					}
				}
				oldData = JSON.stringify(result.data);
				initFoldInfo();
				def.resolve(result);
			}
		});
		return def;
	})(result);
});
