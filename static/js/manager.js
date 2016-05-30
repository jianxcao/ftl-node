define(['jquery', "js/tplToHtml", "js/setData", "lib/Sortable", "js/infoTip", "js/command", "lib/scrollBar/scrollBar", "lib/keymaster", "bootstrap"],
 function($, tplToHtml, setData, Sortable, infoTip, command, scrollBar, keymaster) {
	var manager = {
		cache: {},
		init: function(configModel) {
			this.configModel = configModel;
			var data = configModel.data;
			manager.cache.panelEle = $('.content-col');
			manager.cache.sidebarEle = $('.sidebar');
			if(data.runCmd) {
				command.saveCheckCommand(1);
			}
			manager.initDefaultData()
			.then(function() {
				manager.initSideNav();
				manager.navChangeSort();
				manager.initMenu();
				manager.initProjectPanelEvt();
				manager.initSave();
			});
		},
		// 右侧列表默认初始化
		initDefaultData: function() {
			var data = this.configModel.data;
			var host = [];
			if (data.host && data.host.length) {
				host = data.host.slice(0);
			}
			//将折叠信息注入数组，当成一个属性
			host.foldInfo = this.configModel.foldInfo;
			// 初始化左侧菜单
			return tplToHtml("/tpl/manager-menu.tpl", host)
			.then(function(html) {
				if (html) {
					manager.cache.sidebarEle.append(html);
				}
			});
		},
		// 左侧菜单初始化
		initSideNav: function() {
			var sidebarEle = this.cache.sidebarEle,
				panelEle = this.cache.panelEle,
				configModel = this.configModel;
			// 展开收起
			sidebarEle
			.delegate('dt', 'click', function(e) {
				var me = $(this),
					dd = me.next('dd'),
					groupName = me.attr('data-group-name'),
					folderIcon = me.find('.folder-icon');
				if (dd.hasClass('hidden')) {
					configModel.setFoldInfo(groupName, false);
					dd.removeClass('hidden');
					folderIcon.addClass('glyphicon-folder-open').removeClass('glyphicon-folder-close');
				} else {
					dd.addClass('hidden');
					configModel.setFoldInfo(groupName, true);
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
					host = configModel.data.host;
				// 如果选择的是一个分支
				if (dd.length) {
					groupName = dd.parent().attr('data-group-name');
					branchName = dd.attr('data-branch-name');
					tmp = configModel.findBranch(groupName, branchName);
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
					tmp = configModel.findGroup(groupName);
					if (tmp) {
						dl = dt.closest('dl');
						panelEle.find(".form-wrap[data-group-name='" + groupName + "']").remove();
						dl.remove();
						host.splice(tmp.index, 1);
					}
				}
				return false;
				// 禁止用
			})
			.delegate('.dis-icon', 'click', function(e) {
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
					tmp = configModel.findBranch(groupName, branchName);
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
					tmp = configModel.findGroup(groupName);
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
			})
			.delegate('dd[data-fun]', 'click', function(e) {
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
				var setData = manager.configModel.data;
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
			var configModel = this.configModel;
			var host = configModel.data.host;
			// 确认创建一个分组
			createGroup.find('.confirm-create-group').click(function() {
				var val = groupNameEle.val(),
					gEle, err;
				val = $.trim(val);
				err = "";
				if (!val) {
					err = "分组名称是必须的";
				} else {
					gEle = configModel.findGroup(val);
					if (gEle) {
						err = "已经有同名的分组存在";
					}
				}
				if (err) {
					alert(err);
				} else {
					var data = {
						groupName: val
					};
					tplToHtml("/tpl/manager-menu.tpl", [data])
						.then(function(html) {
							host.push(data);
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
				groupNameMenu = $('.group-name-menu', createBranch);
			var configModel = this.configModel;
			var host = configModel.data.host;

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
				tmp = configModel.findGroup(groupName);
				if (tmp) {
					status = configModel.findBranch(groupName, branchName);
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
					var data = {
						groupName: groupName,
						branches: [{
							branchName: branchName
						}]
					};
					tplToHtml("/tpl/manager-menu.tpl", [data])
						.then(function(html) {
							var dl, dd;
							host.push(data);
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
						host = manager.configModel.data.host;
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
					tmp = manager.configModel.findGroup(groupName);
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
				content = this.cache.panelEle,
				configModel = this.configModel;
			tplToHtml("/tpl/manager-one-content.tpl")
				.then(function(html) {
					content
					.on('click', '.create-path', function(e) {
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
						command.sendCommand(param);
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
							tmp = configModel.findBranch(groupName, branchName);
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
				configModel = this.configModel,
				data, tmp,
				allFormWrap = panelEle.find('.form-wrap');
			current = allFormWrap.filter("[data-branch-name='" + branchName + "'][data-group-name='" + groupName + "']");
			if (current.length) {
				allFormWrap.hide();
				current.show();
			} else {
				tmp = configModel.findBranch(groupName, branchName);
				data = $.extend({
					groupName: groupName,
					branchName: branchName
				}, tmp ? tmp.branch : null);
				tplToHtml("/tpl/manager-content.tpl", data)
				.then(function(html) {
					allFormWrap.hide();
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
							tmp = configModel.findBranch(groupName, branchName);
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
					return command.setCommandBtn(groupName, branchName);
				});
			}
			return this;
		},
		// 更新面板的数据
		setPanelData: function() {
			var content = this.cache.panelEle,
				configModel = this.configModel;
			content.find('.form-wrap[data-branch-name][data-group-name]').each(function() {
				var me = $(this),
					formGroup = me.find('.form-group'),
					groupName = me.attr('data-group-name'),
					branchName = me.attr('data-branch-name'),
					tmp,
					data = {
						branchName: branchName,
						val: []
					};

				formGroup.filter('.base-path-group, .code-virtual-path-group')
				.each(function() {
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
						if (me.hasClass('code-virtual-path-group')) {
							one.disabled = !!me.hasClass('disabled');
						}
						data.val.push(one);
					}
				});
				tmp = configModel.findBranch(groupName, branchName);
				if (tmp && tmp.branch) {
					$.extend(tmp.branch, data);
				}
			});
			return this;
		},
		// 保存
		initSave: function() {
			var save = $('.save').click(function(e) {
				//先将当前面版中的数据更新到setData中去
				manager.setPanelData();
				manager.configModel.save();
			});
			keymaster('⌘+s, ctrl+s', function(event, handler){
				save.triggerHandler('click');
				return false;
			});
			return this;
		}
	};
	// 得到后端数据后开始初始化
	setData.then(function(configModel) {
		manager.init(configModel);
		// 加载通知模块
		require(["js/notifiy"]);
		return configModel;
	});
});
