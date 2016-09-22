define(["js/infoTip", "config"], function(infoTip, config) {
	// 命令接口，可以调用当前分组的命令
	return {
		// 发送执行run.config.js中的命令
		/**
		 *
		 * @param param ajax参数
		 * {
		 *   type: 1|2 1表示运行命令，2表示停止命令
		 *   branchName 分支名称
		 *   groupName 分组名称
		 * }
		 * @pram isTip true 则提示否则 不给提示，仅仅调用
		 * @returns promise
		 */
		/* stats解析 0表示系统错误
		 *1开头表示 启动命令的结果
		 * 11: 运行命令出错
		 * 12: 命令已经在运行中
		 * 13: 没有配置文件
		 * 14: 配置文件解析出错
		 *2开头表示 结束命令的结果
		 * 21 停止命令出错
		 * 22 表示当前么有这个命令
		 **/
		sendCommand: function(param, isTip) {
			if (isTip === undefined) {
				isTip = true;
			}
			return $.post(config.baseUrl + "/sys/shell_control.html", param)
				.then(function(data) {
					try {
						data = typeof data === "object" ? data : JSON.parseJSON(data);
						data.status = +data.status || 0;
						if (data.status === 1 || data.status === 2) {
							isTip && infoTip.toast(data.message);
						} else {
							isTip && infoTip.wrongToast(data.message);
						}
					} catch (err) {
						isTip && infoTip.wrongToast();
					}
					return data;
				})
				.fail(function() {
					infoTip.wrongToast();
				});
		},
		// 设置 每个项目上的启动和停止按钮的显示
		setCommandBtn: function(groupName, branchName) {
			return this.checkCommand(groupName, branchName)
				.then(function(status) {
					// 找到当前面板
					var current =
						$(".content-col .form-wrap[data-branch-name='" + branchName + "'][data-group-name='" + groupName + "']");
					var btnWrap;
					var html = ['<button type="button" class="btn btn-default start-shell">start</button>',
						'<button type="button" class="btn btn-default stop-shell">stop</button>'
					].join('');
					// 如果当前支持命令,并且当前面板已经被创建了
					if (status && current.length) {
						// 如果当前没有置入2个按钮
						// 调用命令置入按钮
						btnWrap = current.find('.branch-btn-wrap');
						if (!btnWrap.find('.start-shell').length) {
							btnWrap.prepend(html);
						}
					}
				});
		},
		// 检测是否有run.config.js中的start这个命令
		checkCommand: function(groupName, branchName) {
			var d = $.Deferred();
			$.post(config.baseUrl + "/sys/is_have_shell_control.html", {
				groupName: groupName,
				branchName: branchName
			})
				.always(function(txt) {
					if (txt === "1" || txt === "0") {
						d.resolve(txt === "1" ? true : false);
					} else {
						infoTip.wrongToast();
					}
				});
			return d;
		},
		/**
		 * 在点击应用的时候检测所有分支的 状态哪个的状态发生了变话，就去调用 
		 * 启动或停止这个分支下的run.config.js的命令，如果命令已经被调用，则掉了没有反映，
		 * 如果命令已经停止，调用停止也没有用，如果没有命令（即没有run.config.js），则调用不生效
		 * run.config.js应该配置在项目的根目录，并且配置的时候请配置项目的根目录
		 *@param type 如果type为1就只执行 启动命令，如果type为2则只执行停止命令 
		 *  不传递 type则执行启动和停止命令
		 */
		saveCheckCommand: function(type) {
			var setData = require("js/setData");
			var com = this;
			var al = function(result) {
				var status = result.status;
				// 挑选一些状态提示，其他状态不提示
				if (status === 1 || status === 2) {
					infoTip.toast(result.message);
					return true;
				}
				if (status === 21 || status === 11 || status === 14) {
					infoTip.wrongToast(result.message);
				}
			};
			type = +type;
			return setData.then(function(result) {
				var myCache = {},
					keys;
				var host = result.data.host || [];
				var oldHost = JSON.parse(result.oldData || "{}").host || [];
				var commandConfigs = [];
				if (type === 1 || type === 2) {
					host.forEach(function(group) {
						if (group.branches && group.branches.length) {
							group.branches.forEach(function(branch) {
								var disabled = group.disabled ? 2 : (branch.disabled ? 2 : 1);
								if (type === disabled) {
									commandConfigs.push({
										type: type,
										branchName: branch.branchName,
										groupName: group.groupName
									});
								}
							});
						}
					});
				} else {
					host.forEach(function(group) {
						if (group.branches && group.branches.length) {
							group.branches.forEach(function(branch) {
								myCache[group.groupName + "_" + branch.branchName] = group.disabled ? true : (branch.disabled ? true : false);
							});
						}
					});
					oldHost.forEach(function(group) {
						if (group.branches && group.branches.length) {
							group.branches.forEach(function(branch) {
								var status = group.disabled ? true : (branch.disabled ? true : false);
								var key = group.groupName + "_" + branch.branchName;
								var commandConfig = {
									branchName: branch.branchName,
									groupName: group.groupName
								};
								if (myCache[key] !== undefined) {
									// 状态发送变换
									if (myCache[key] !== status) {
										commandConfig.type = myCache[key] ? 2 : 1;
									}
								} else {
									commandConfig.type = 2;
								}
								if (commandConfig.type) {
									if (commandConfig) {
										commandConfigs.push(commandConfig);
									}
								}
								delete myCache[key];
							});
						}
					});
					for (var key in myCache) {
						// 这里只能是开始运行命令
						if (!myCache[key]) {
							keys = key.split("_");
							commandConfigs.push({
								type: 1,
								branchName: keys[1],
								groupName: keys[0]
							});
						}
					}
				}
				if (commandConfigs && commandConfigs.length) {
					commandConfigs.forEach(function(commandConfig) {
						com.sendCommand(commandConfig, false)
							.then(al);
					});
				}
			});
		}
	};
});
