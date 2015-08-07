(function($) {
	var getGuid = function() {
		getGuid.__id = getGuid.__id || 10;
		getGuid.__id = getGuid.__id + 1;
		return getGuid.__id;
	};
	var baseUrl = window.baseUrl;
	var manager = {
		cache: {
			// 所有的路径存放
			setData: {},
			// 所有路径的备份，当配置发生变化，但是还没同步到服务器的时候，这个字符串和setData不同
			strSetData: "",
			sortObj: {}
		},
		init: function() {
			$.get(baseUrl + "/sys/get_config_ajax.html").then(function(data) {
					try {
						if (typeof data == "string") {
							data = JSON.parseJSON('data');
						}
						manager.cache.setData = data;
					} catch (e) {
						console.error("从服务器获取数据后解析错误");
						manager.cache.setData = {};
					}
				}, function() {
					console.error("loading error");
					manager.cache.setData = {};
				})
				.always(function() {
					// 缓存数据为空，一开始的时候
					manager.cache.strSetData = JSON.stringify({});
					manager.saveCheckCommand(1);
					manager.cache.strSetData = JSON.stringify(manager.cache.setData);
					manager.cache.panelEle = $('.content-col');
					manager.cache.sidebarEle = $('.sidebar');
				})
				.then(manager.initDefaultData)
				.always(function() {
					manager.initSideNav();
					manager.navChangeSort();
					manager.initMenu();
					manager.initProjectPanelEvt();
					manager.initSave();
				});
		},
		initDefaultData: function() {
			var setData = manager.cache.setData;
			if (!setData.host) {
				setData.host = [];
			}
			// 初始化左侧菜单
			return manager.getTplByPath("/tpl/manager-menu.tpl").then(function(tpl) {
				var d = $.Deferred();
				var html = $.template(tpl, setData.host);
				manager.cache.sidebarEle.append(html);
			});
		},
		// 左侧菜单初始化
		initSideNav: function() {
			var sidebarEle = this.cache.sidebarEle,
				panelEle = this.cache.panelEle;
			// 展开收起
			sidebarEle.delegate('dt', 'click', function(e) {
					var me = $(this),
						dd = me.next('dd'),
						folderIcon = me.find('.folder-icon');
					if (dd.hasClass('hidden')) {
						dd.removeClass('hidden');
						folderIcon.addClass('glyphicon-folder-open').removeClass('glyphicon-folder-close');
					} else {
						dd.addClass('hidden');
						folderIcon.addClass('glyphicon-folder-close').removeClass('glyphicon-folder-open');
					}
					// 删除
				})
				.delegate('.del-icon', 'click', function(e) {
					var me = $(this),
						dd = me.closest('dd[data-fun]'),
						dt = me.closest('dt'),
						dl,
						tmp, groupName, branchName,
						host = manager.cache.setData.host;
					// 如果选择的是一个分支
					if (dd.length) {
						groupName = dd.parent().attr('data-group-name');
						branchName = dd.attr('data-branch-name');
						tmp = manager.findBranch(groupName, branchName);
						if (tmp) {
							// 如果当前分支是激活的
							panelEle.find(".form-wrap[data-branch-name='" + branchName + "'][data-group-name='" + groupName + "']").remove();
							dd.remove();
							tmp.group.branches.splice(tmp.index, 1);
						}
					}
					//  如果选择的是一个分组，直接删除这个分组
					if (dt.length) {
						groupName = dt.attr('data-group-name');
						tmp = manager.findGroup(groupName);
						if (tmp) {
							dl = dt.closest('dl');
							panelEle.find(".form-wrap[data-group-name='" + groupName + "']").remove();
							dl.remove();
							host.splice(tmp.index, 1);
						}
					}
					return false;
					// 禁止用
				}).delegate('.dis-icon', 'click', function(e) {
					var me = $(this),
						tmp, status;
					var dd = me.closest('dd[data-fun]');
					var dt = me.closest('dt');
					var dl, activeDD;
					var groupName, branchName;
					// 如果选择的是一个分支
					if (dd.length) {
						// 找到dl元素
						dl = dd.closest('dl[data-fun]');
						groupName = dl.attr('data-group-name');
						branchName = dd.attr('data-branch-name');
						tmp = manager.findBranch(groupName, branchName);
						status = !dd.hasClass('disabled');
						tmp.branch.disabled = status;
						dd[status ? "addClass" : "removeClass"]('disabled');
						if (tmp.branch.val && tmp.branch.val.length) {
							tmp.branch.val.forEach(function(one) {
								one.disabled = status;
							});
						}
						panelEle.find('.form-wrap[data-group-name="' + groupName + '"][data-branch-name="' + branchName + '"]')
							.find('.drag-wrap .form-group')[status ? "addClass" : "removeClass"]('disabled');
						// 循环判断一个分组下的所有分支是否全部都是禁用的
						status = true;
						$.each(tmp.group.branches, function(inedx, one) {
							if (!one.disabled) {
								status = false;
								return false;
							}
						});
						if (tmp.group.disabled !== status) {
							tmp.group.disabled = status;
							dl[status ? "addClass" : "removeClass"]('disabled');
						}
					}
					//  如果选择的是一个分组
					if (dt.length) {
						dl = dt.closest('dl');
						groupName = dl.attr('data-group-name');
						tmp = manager.findGroup(groupName);
						if (tmp) {
							status = !dl.hasClass('disabled');
							dl[status ? "addClass" : "removeClass"]('disabled');
							dl.find('dd[data-fun="project"]')[status ? "addClass" : "removeClass"]('disabled');

							panelEle.find('.form-wrap[data-group-name="' + groupName + '"]')
								.find('.drag-wrap .form-group')[status ? "addClass" : "removeClass"]('disabled');

							// 同步内存状态
							tmp.group.disabled = status;
							if (tmp.group && tmp.group.branches.length) {
								tmp.group.branches.forEach(function(branch) {
									branch.disabled = status;
									if (branch.val && branch.val.length) {
										branch.val.forEach(function(one) {
											one.disabled = status;
										});
									}
								});
							}
						}
					}
					return false;
					// 点击展开右侧面板
				}).delegate('dd[data-fun]', 'click', function(e) {
					var me = $(this),
						branchName = me.attr('data-branch-name'),
						groupName = me.parent().attr('data-group-name');
					if (!me.hasClass('active')) {
						sidebarEle.find('dd.active[data-fun="project"]').removeClass('active');
						me.addClass('active');
						manager.initProjectPanel(groupName, branchName);
					}
				})
				.delegate('dd[data-fun]', 'dblclick', function(e) {
					$('.disabled-all').trigger('click');
					$(this).find('.dis-icon').trigger('click');
					$('.save:eq(0)').triggerHandler("click");
				});
			return this;
		},
		// 初始化上部菜单
		initMenu: function() {
			var treeWrap = this.cache.sidebarEle,
				createGroup = $('#create-group'),
				createBranch = $('#create-branch'),
				panelEle = this.cache.panelEle;
			//弹出分组弹窗
			$('.panel-heading').delegate('.new-group', 'click', function(e) {
				$('.group-name', createGroup).val("");
				// 显示创建分组对话框
				createGroup.modal({
					keyboard: true
				});
				// 弹出分支弹窗
			}).delegate('.new-branch', 'click', function(e) {
				var menuListWrap = $('.group-name-menu', createBranch);
				var groupNames = treeWrap.find('dl[data-fun="group"] dt').map(function() {
					return '<li><a href="javascript:;">' + this.getAttribute('data-group-name') + '</a></li>';
				});
				var html = Array.prototype.join.call(groupNames, "");
				menuListWrap.html(html);
				if (!html) {
					menuListWrap.css('display', "none");
				} else {
					menuListWrap.css('display', "");
				}
				// 显示创建分支对话框
				createBranch.modal({
					keyboard: true
				});
				// 禁用全部
			}).delegate('.disabled-all', 'click', function(e) {
				treeWrap.find('dl[data-fun], dd[data-fun]').addClass('disabled');
				panelEle.find('.drag-wrap .form-group').addClass('disabled');
				var setData = manager.cache.setData;
				// 修改内存数据
				if (setData.host && setData.host.length) {
					setData.host.forEach(function(oneHost) {
						oneHost.disabled = true;
						if (oneHost.branches && oneHost.branches.length) {
							oneHost.branches.forEach(function(branch) {
								branch.disabled = true;
								if (branch.val && branch.val.length) {
									branch.val.forEach(function(one) {
										one.disabled = true;
									});
								}
							});
						}
					});
				}
			});
			manager.initGroupDialog(treeWrap, createGroup);
			manager.initBranchDialog(treeWrap, createBranch);
			return this;
		},
		initGroupDialog: function(treeWrap, createGroup) {
			var groupNameEle = $('.group-name', createGroup);
			var host = this.cache.setData.host;
			// 确认创建一个分组
			createGroup.find('.confirm-create-group').click(function() {
				var val = groupNameEle.val(),
					gEle, err;
				val = $.trim(val);
				err = "";
				if (!val) {
					err = "分组名称是必须的";
				} else {
					gEle = manager.findGroup(val);
					if (gEle) {
						err = "已经有同名的分组存在";
					}
				}
				if (err) {
					alert(err);
				} else {
					manager.getTplByPath("/tpl/manager-menu.tpl")
						.then(function(tpl) {
							var data = {
								groupName: val
							};
							host.push(data);
							var html = $.template(tpl, [data]);
							html = $(html);
							manager.branchSort(html.find('dd.item dl')[0]);
							treeWrap.append(html);
						});
					createGroup.modal('hide');
				}
			});
			// enter事件挂接
			groupNameEle.keydown(function(e) {
				if (e.keyCode == 13) {
					createGroup.find('.confirm-create-group').trigger('click');
				}
			});
			return this;
		},
		initBranchDialog: function(treeWrap, createBranch) {
			var groupNameEle = $('.group-name', createBranch),
				branchNameEle = $('.branch-name', createBranch),
				groupNameMenu = $('.group-name-menu', createBranch),
				host = this.cache.setData.host;
			groupNameMenu.on('click', "li a", function(e) {
				groupNameEle.val($.trim($(this).text()));
				branchNameEle.focus();
			});
			groupNameEle.keydown(function(e) {
				if (e.keyCode == 9) {
					groupNameMenu.dropdown('toggle');
					window.setTimeout(function() {
						branchNameEle.focus();
					}, 16);
				}
			});
			// enter事件挂接
			branchNameEle.keydown(function(e) {
				if (e.keyCode == 13) {
					createBranch.find('.confirm-create-branch').trigger('click');
				}
			});
			// 创建一个分支
			createBranch.find('.confirm-create-branch').click(function() {
				var err = "",
					item, status = false,
					groupName = $.trim(groupNameEle.val()),
					branchName = $.trim(branchNameEle.val()),
					tmp,
					group, branch;
				if (!groupName) {
					err = "请输入或选择您的分组名称";
				}
				if (!branchName) {
					err = "请输入您的分支名称";
				}
				if (err) {
					alert(err);
					return;
				}
				// 已经存在这个分组
				tmp = manager.findGroup(groupName);
				if (tmp) {
					status = manager.findBranch(groupName, branchName);
					if (status) {
						alert('该分支已经存在');
						return;
					}
					group = tmp.group;
					if (!group.branches) {
						group.branches = [];
					}
					group.branches.push({
						branchName: branchName
					});
					item = treeWrap.find("[data-fun='group'][data-group-name='" + groupName + "'] dl[data-group-name='" + groupName + "']");
					item.append('<dd data-fun="project" data-branch-name="' + branchName + '">' + branchName +
							'<span class="glyphicon glyphicon-ban-circle dis-icon">' + '</span><span class="glyphicon glyphicon-trash del-icon"></span></dd>')
						.find('dd[data-fun]:last').trigger('click');
					// 当前分组不存在
				} else {
					manager.getTplByPath("/tpl/manager-menu.tpl")
						.then(function(tpl) {
							var data = {
									groupName: groupName,
									branches: [{
										branchName: branchName
									}]
								},
								html, dl, dd;
							host.push(data);
							html = $.template(tpl, [data]);
							html = $(html);
							treeWrap.append(html);
							dl = html.find('dd.item dl');
							dl.find('dd[data-fun]:last').trigger('click');
							manager.branchSort(dl[0]);
						});
				}
				createBranch.modal('hide');
			});
			return this;
		},
		// 左侧菜单交换位置
		navChangeSort: function() {
			var sidebar = this.cache.sidebarEle;
			var group = new Sortable(sidebar[0], {
				group: "group",
				animation: 150,
				handle: "dt",
				ghostClass: "sortable-ghost",
				draggable: ".nav",
				onEnd: function(evt) {
					var oldIndex = evt.oldIndex,
						val, ex,
						newIndex = evt.newIndex;
					// 找到父元素
					var ele = $(this.el),
						setData = manager.cache.setData,
						host = setData.host;
					if (host && host.length) {
						if (typeof oldIndex == "number" && typeof newIndex === "number" &&
							host[newIndex] && host[oldIndex]) {
							ex = host.splice(oldIndex, 1);
							ex.unshift(newIndex, 0);
							Array.prototype.splice.apply(host, ex);
						}
					}
				}
			});
			sidebar.find('dl[data-fun="group"] dd.item dl').each(function() {
				manager.branchSort(this);
			});
			return this;
		},
		// 分支位置交换初始化方法
		branchSort: function(element) {
			new Sortable(element, {
				animation: 150,
				ghostClass: "sortable-ghost",
				handle: "dd",
				draggable: "dd",
				// 阻止冒泡防止下层事件对自己的影响
				filter: function(evt, target) {
					if ($(target).closest('dd.item').length) {
						evt.stopPropagation();
						return false;
					}
				},
				onEnd: function(evt) {
					var oldIndex = evt.oldIndex,
						val, tmp, ex,
						newIndex = evt.newIndex;
					// 找到父元素
					var ele = $(this.el),
						groupName = ele.attr('data-group-name');
					tmp = manager.findGroup(groupName);
					if (typeof oldIndex == "number" && typeof newIndex === "number" &&
						oldIndex !== newIndex && tmp && tmp.group && tmp.group.branches) {
						val = tmp.group.branches;
						ex = val.splice(oldIndex, 1);
						ex.unshift(newIndex, 0);
						Array.prototype.splice.apply(val, ex);
					}
				}
			});
			return this;
		},
		// 右侧panel上的事件
		initProjectPanelEvt: function() {
			var sidebarEle = this.cache.sidebarEle,
				content = this.cache.panelEle;
			this.getTplByPath("/tpl/manager-one-content.tpl")
				.then(function(html) {
					content.on('click', '.create-path', function(e) {
							var me = $(this);
							me.closest('.form-wrap').find('.drag-wrap').append(html);
						})
						.on('click', ".start-shell, .stop-shell", function(e) {
							var me = $(this);
							var pp = me.parents('.form-wrap');
							var param = {
								type: me.hasClass('start-shell') ? 1 : 2,
								groupName: pp.attr("data-group-name"),
								branchName: pp.attr("data-branch-name")
							};
							manager.sendCommand(param);
							return false;
						})
						.on('click', ".del-icon", function() {
							var me = $(this);
							me.closest('.form-group').remove();
							return false;
						})
						// 禁用某个分支下的某一条
						.on('click', ".dis-icon", function() {
							var dd = $(this).closest('.form-group'),
								formWrap = dd.closest('.form-wrap'),
								branchName = formWrap.attr('data-branch-name'),
								groupName = formWrap.attr('data-group-name'),
								status, tmp,
								index = dd.index();
							if (branchName && groupName) {
								status = !dd.hasClass('disabled');
								tmp = manager.findBranch(groupName, branchName);
								// 改自己的状态
								if (tmp.branch && tmp.branch.val && tmp.branch.val[index]) {
									tmp.branch.val[index].disabled = status;
									dd[status ? "addClass" : "removeClass"]('disabled');
									status = true;
									// 只要有一个是false就是false
									$.each(tmp.branch.val, function(index, one) {
										if (!one.disabled) {
											status = false;
											return false;
										}
									});
									if (tmp.branch.disabled !== status) {
										tmp.branch.disabled = status;
										sidebarEle.find("dl[data-fun='group'][data-group-name='" + groupName + "']")[status ? "addClass" : "removeClass"]('disabled');
									}
									status = true;
									$.each(tmp.group.branches, function(index, branch) {
										if (!branch.disabled) {
											status = false;
											return false;
										}
									});
									if (tmp.group.disabled !== status) {
										tmp.group.disabled = status;
										sidebarEle.find("dd[data-branch-name='" + branchName + "'][data-fun='project']")[status ? "addClass" : "removeClass"]('disabled');
									}
								}
							}
							return false;
						});
				});
			return this;
		},
		// 点击菜单后右侧panel初始化
		initProjectPanel: function(groupName, branchName) {
			var panelEle = manager.cache.panelEle,
				allFormWrap = panelEle.find('.form-wrap');
			current = allFormWrap.filter("[data-branch-name='" + branchName + "'][data-group-name='" + groupName + "']");
			if (current.length) {
				allFormWrap.hide();
				current.show();
			} else {
				manager.getTplByPath("/tpl/manager-content.tpl")
				.then(function(tpl) {
					allFormWrap.hide();
					var data, html, tmp;
					tmp = manager.findBranch(groupName, branchName);
					data = $.extend({
						groupName: groupName,
						branchName: branchName
					}, tmp ? tmp.branch : null);
					html = $.template(tpl, data);
					manager.cache.panelEle.append(html);
					current = panelEle.find(".form-wrap[data-branch-name='" + branchName + "'][data-group-name='" + groupName + "']");
					new Sortable(current.find('.drag-wrap')[0], {
						animation: 150,
						ghostClass: "sortable-ghost",
						scroll: false,
						handle: ".move-icon",
						draggable: ".form-drag",
						onEnd: function(evt) {
							var oldIndex = evt.oldIndex,
								val, tmp, ex,
								newIndex = evt.newIndex;
							// 找到父元素
							var ele = $(this.el).closest('.form-wrap'),
								branchName = ele.attr('data-branch-name'),
								groupName = ele.attr('data-group-name');
							tmp = manager.findBranch(groupName, branchName);
							if (typeof oldIndex == "number" && typeof newIndex === "number" &&
								tmp && tmp.branch && tmp.branch.val) {
								val = tmp.branch.val;
								if (val[newIndex] && val[oldIndex]) {
									ex = val.splice(oldIndex, 1);
									ex.unshift(newIndex, 0);
									Array.prototype.splice.apply(val, ex);
								}
							}
						}
					});
				})
				.then(function() {
					// 检测项目根目录是否配置run.config.js并且该js 被node require后没有任何问题
					//则置入 start 和 stop按钮
					return manager.setCommandBtn(groupName, branchName);
				});
			}
			return this;
		},
		// 更新面板的数据
		setPanelData: function() {
			var content = this.cache.panelEle;
			content.find('.form-wrap[data-branch-name][data-group-name]').each(function() {
				var me = $(this),
					formGroup = me.find('.form-group'),
					groupName = me.attr('data-group-name'),
					branchName = me.attr('data-branch-name'),
					tmp,
					data = {};
				formGroup.each(function() {
					var me = $(this),
						inputs = me.find('input'),
						one = {};
					inputs.each(function() {
						if (this.value) {
							if (this.name == 'basePath') {
								data.basePath = this.value.replace(/\\/g, "/");
							} else {
								one[this.name] = this.value.replace(/\\/g, "/");
							}
						}
					});
					if (!$.isEmptyObject(one)) {
						if (me.hasClass('form-drag')) {
							one.disabled = !!me.hasClass('disabled');
						}
						data.val = data.val || [];
						data.val.push(one);
					}
				});
				tmp = manager.findBranch(groupName, branchName);
				if (tmp && tmp.branch) {
					$.extend(tmp.branch, data);
				}
			});
			return this;
		},
		// 找到一个分组
		findGroup: function(groupName) {
			var retVal = null,
				setData = this.cache.setData;
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
				tmp = manager.findGroup(groupName);
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
		// 获取模板
		getTplByPath: function(path) {
			var d = $.Deferred();
			manager.cache.tpl = manager.cache.tpl || {};
			if (manager.cache.tpl[path]) {
				d.resolve(manager.cache.tpl[path]);
				return d;
			} else {
				return $.get(window.cdnBaseUrl + path)
					.fail(function() {
						alert("路径为" + path + "的模板载入错误");
					}).success(function(data) {
						manager.cache.tpl[path] = data;
					});
			}
		},
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
		/*stats解析 0表示系统错误
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
			return $.post(baseUrl + "/sys/shell_control.html", param)
				.then(function(data) {
					try {
						data = typeof data === "object" ? data : JSON.parseJSON(data);
						data.status = +data.status || 0;
						if (data.status === 1 || data.status === 2) {
							isTip && manager.toast(data.message);
						} else {
							isTip && manager.wrongToast(data.message);
						}
					} catch (err) {
						isTip && manager.wrongToast();
					}
					return data;
				})
				.fail(function() {
					manager.wrongToast();
				});
		},
		// 设置 每个项目上的启动和停止按钮的显示
		setCommandBtn: function(groupName, branchName) {
			return manager.checkCommand(groupName, branchName)
				.then(function(status) {
					// 找到当前面板
					var current = manager.cache.panelEle.find(".form-wrap[data-branch-name='" + branchName + "'][data-group-name='" + groupName + "']");
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
			$.post(baseUrl + "/sys/is_have_shell_control.html", {
				groupName: groupName,
				branchName: branchName
			})
			.always(function(txt) {
				if (txt === "1" || txt === "0") {
					d.resolve(txt === "1" ? true : false);
				} else {
					manager.wrongToast();
				}
			});
			return d;
		},
		/**
		 * 在点击应用的时候检测所有分支的 状态哪个的状态发生了变话，就去调用 
		 * 启动或停止这个分支下的run.config.js的命令，如果命令已经被调用，则掉了没有反映，
		 * 如果命令已经停止，调用停止也没有用，如果没有命令（即没有run.config.js），则调用不生效
		 * run.config.js应该配置在项目的根目录，并且配置的时候请配置项目的根目录
		 *@param type 如果type为1就强制 只执行 启动命令，如果type为2则强制只执行停止命令 
		 *  不传递 type则执行启动和停止命令
		 */
		saveCheckCommand: function(type) {
			///////////////////////////////////////////////////////////////////////保存时候如果跟路径发生变换也需要处理/////////////////////////////////////////
			var myCache = {}, keys;
			var host = manager.cache.setData.host || [];
			var oldHost = JSON.parse(manager.cache.strSetData).host || [];
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
						var commandConfig;
						if (myCache[key] !== undefined) {
							// 状态发送变换
							if (myCache[key] !== status) {
								commandConfig = {
									type: myCache[key] ? 2 : 1,
									branchName: branch.branchName,
									groupName: group.groupName
								};
							}
						} else {
							commandConfig = {
								type: 2,
								branchName: branch.branchName,
								groupName: group.groupName
							};
						}
						if (commandConfig) {
							// 只发送启动命令
							if (type === 1) {
								if (commandConfig.type !== 1) {
									commandConfig = null;
								}
							// 只发送停止命令
							} else if (type === 2) {
								if (commandConfig.type !== 2) {
									commandConfig = null;
								}
							}
							if (commandConfig) {
								manager.sendCommand(commandConfig, false)
								.then(function(result) {
									var status = result.status;
									// 挑选一些状态提示，其他状态不提示
									if (status === 1 || status === 2) {
										manager.toast(result.message);
									}
									if (status === 21 || status === 11 || status === 14) {
										manager.wrongToast(result.message);
									}
								});
							}
						}
						delete myCache[key];
					});
				}
			});
			for(var key in myCache) {
				if (type === 1 || type === undefined) {
					// 这里只能是开始运行命令
					if (!myCache[key]) {
						keys = key.split("_");
						manager.sendCommand({
							type: 1,
							branchName: keys[1],
							groupName: keys[0]
						}, false)
						.then(function(result) {
							var status = result.status;
							// 挑选一些状态提示，其他状态不提示
							if (status === 1 || status === 2) {
								manager.toast(result.message);
							}
							if (status === 21 || status === 11 || status === 14) {
								manager.wrongToast(result.message);
							}
						});
					}
				}
			}
		},
		// 保存
		initSave: function() {
			var save = $('.save').click(function(e) {
				//先将当前面版中的数据更新到setData中去
				manager.setPanelData();
				var strData = JSON.stringify(manager.cache.setData);
				var oldstrData = manager.cache.strSetData;
				// 如果数据完全一样，就证明根本没有改配置
				if (strData === oldstrData) {
					return;
				}
				$.post(baseUrl + '/sys/set_config_ajax.html', {
					data: strData
				}).then(function(status) {
					status = +status;
					if (status === 1) {
						manager.cache.panelEle
						.find('.form-wrap[data-branch-name][data-group-name]')
						.each(function() {
							var me = $(this),
								groupName = me.attr('data-group-name'),
								branchName = me.attr('data-branch-name');
							if (groupName && branchName) {
								// 检测当前分支的btn是否更新
								manager.setCommandBtn(groupName, branchName);
							}
						});
						manager.saveCheckCommand();
						// 更新缓存数据
						manager.cache.strSetData = strData;
						manager.alertTip("服务器配置更新成功", 500);
					} else {
						manager.wrongToast("服务器配置失败");
					}
				}, function() {
					manager.wrongToast("系统忙，请稍后在试试");
				});
			});
			$(document).on('keydown', function(e) {
				if (e.ctrlKey && +e.keyCode === 83) {
					save.triggerHandler('click');
					return false;
				}
			});
			return this;
		},
		/**
		 *  打开一个提示
		 * @param type {number}弹窗类型 1表示成功 0表示警告
		 * @param msg 消息内容，可以是html字符传
		 * @param closeTime {number} 不传递或者 值为0就表示不关闭一直提示
		 */
		alertTip: function(type, msg, closeTime) {
			var tpl = '<div class="fade in alert alert-<%=data.type%> tip"><%=data.msg%></div>';
			var html, ele;
			closeTime = +closeTime;
			if (typeof type === "string") {
				closeTime = msg;
				msg = type;
				type  = 1;
			}
			html = $.template(tpl, {
				type: type == 1 ? "success" : "warning",
				msg: msg
			});
			ele = $(html).appendTo($('.tipArea')).alert();
			if (closeTime) {
				window.setTimeout(function() {
					ele.alert("close");
				}, closeTime);
			}
		},
		toast: function(type, msg) {
			if (typeof type === "string") {
				msg = type;
				type  = 1;
			}			
			this.alertTip(type, msg, 5000);
		},
		wrongToast: function(msg) {
			this.toast(0, msg || "系统忙，请稍后在试试");
		}
	};
	manager.init();
	window.manager = manager;
})(jQuery);
