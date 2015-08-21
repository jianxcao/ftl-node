define(["jquery", "config", "js/infoTip", "js/command"], function($, config, infoTip, command) {
	var result = {
		data: {},
		oldData: "",
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
		save: function() {
			var data = this.data;
			var strData = JSON.stringify(data);
			var oldstrData = this.oldData;
			var com = this;
			// 如果数据完全一样，就证明根本没有改配置
			if (strData === oldstrData) {
				return;
			}
			$.post(config.baseUrl + '/sys/set_config_ajax.html', {
				data: strData
			}).then(function(status) {
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
					com.oldData = strData;
					infoTip.alertTip("服务器配置更新成功", 500);
				} else {
					infoTip.wrongToast("服务器配置失败");
				}
			}, function() {
				infoTip.wrongToast("系统忙，请稍后在试试");
			});
		}
	};
	return (function(result) {
		var def = $.Deferred();
		$.ajax(config.baseUrl + "/sys/get_config_ajax.html",  {
			cache: false,
			complete: function(data, error) {
				if (error === 'error') {
					result.data = {};
				} else {
					try {
						if (data.responseJSON) {
							result.data = data.responseJSON;
						}
					} catch (e) {
						console.error("从服务器获取数据后解析错误");
						result.data = {};
					}
				}
				result.oldData = JSON.stringify(result.data);
				def.resolve(result);
			}
		});
		return def;
	})(result);
});
