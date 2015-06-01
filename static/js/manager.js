(function($) {
	var manager = {
		cache: {
			// 所有的路径存放
			setData: {}
		},
		init: function() {
			$.get(baseUrl + "sys/get_config_ajax.html").then(function(data) {
				try{
					if (typeof data == "string") {
						data = JSON.parseJSON('data');
					}
					manager.cache.setData = data;
				}catch(e) {
					console.error("从服务器获取数据后解析错误");
					manager.cache.setData = {};
				}
			}, function() {
				console.error("loading error");
				manager.cache.setData = {};
			}).always(function() {
				manager.cache.panelEle = $('.content-col');
				manager.cache.sidebarEle = $('.sidebar');
				manager.initDefaultData();
				manager.initSideNav();
				manager.navChangePos();
				manager.initMenu();
				manager.initProjectPanelEvt();
				manager.initSave();
			});
		},
		initDefaultData: function() {
			var setData = this.cache.setData;
			if (!setData.host) {
				setData.host = [];
			}
			// 初始化左侧菜单
			manager.getTplByPath("/tpl/manager-menu.tpl", function(tpl) {
				var html = $.template(tpl, setData.host);
				manager.cache.sidebarEle.append(html);
			});
			return this;
		},
		// 左侧菜单初始化
		initSideNav: function() {
			// 展开收起
			var sidebarEle = this.cache.sidebarEle,
				panelEle = this.cache.panelEle;
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
			}).delegate('.del-icon', 'click', function(e) {
				var me = $(this),
					dd = me.closest('dd[data-fun]'),
					dt = me.closest('dt'), dl,
					tmp,
					host = manager.cache.setData.host;
				// 如果选择的是一个分支
				if (dd.length) {
					tmp = manager.findBranch($.trim(dd.parents('dl[data-fun="group"]').find('dt').text()), $.trim(dd.text()));
					if (tmp) {
						tmp.group.branches.splice(tmp.index, 1);
						// 如果当前分支是激活的
						if (dd.hasClass('active')) {
							panelEle.html('');
						}
						dd.remove();
					}
				}
				//  如果选择的是一个分组，直接删除这个分组
				if (dt.length) {
					tmp = manager.findGroup($.trim(dt.text()));
					if (tmp) {
						dl = dt.closest('dl');
						if (dl.find('dd.active[data-fun="project"]').length) {
							panelEle.html('');
						}
						dl.remove();
						host.splice(tmp.index, 1);
					}
				}
				return false;
				// 禁用
			}).delegate('.dis-icon', 'click', function(e) {
				var me = $(this);
				var dd = me.closest('dd[data-fun]');
				var dt = me.closest('dt');
				var dl, activeDD;
				// 如果选择的是一个分支
				if (dd.length) {
					// 找到dl元素
					dl = dd.closest('dl');
					// 整个分组处于不可用状态--下面的分支都不可用
					if (dl.hasClass('disabled')) {
						if (dd.hasClass('active')) {
							panelEle.removeClass('disabled');
						}
						dd.removeClass('disabled');
						dl.removeClass('disabled');				
					} else {
						if (dd.hasClass('disabled')) {
							// 如果当前分支是激活的
							if (dd.hasClass('active')) {
								panelEle.removeClass('disabled');
							}
							dd.removeClass('disabled');
						} else {
							if (dd.hasClass('active')) {
								panelEle.addClass('disabled');
							}
							dd.addClass('disabled');
						}
					}
				}
				//  如果选择的是一个分组，直接删除这个分组
				if (dt.length) {
					dl = dt.closest('dl');
					activeDD = dl.find('dd.active[data-fun]');
					if (dl.hasClass('disabled')) {
						dl.removeClass('disabled');
						if (activeDD.length) {
							panelEle.removeClass('disabled');
						}
					} else {
						dl.addClass('disabled');
						if (activeDD.length) {
							panelEle.addClass('disabled');
						}
					}
				}
			// 点击展开右侧面板
			}).delegate('dd[data-fun]', 'click', function(e) {
				var me = $(this),
					branchName = $.trim(me.text()),
					groupName = $.trim(me.closest('dd.item').prev().text());
				if (!me.hasClass('active')) {
					sidebarEle.find('dd.active[data-fun="project"]').removeClass('active');
					me.addClass('active');
					manager.initProjectPanel(groupName, branchName);
				}
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
					return '<li><a href="javascript:;">' + $.trim($(this).text()) + '</a></li>';
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
				var status = !!treeWrap.find('dl[data-fun]').addClass('disabled').find('dd.active[data-fun]').length;
				if (status) {
					panelEle.addClass('disabled');
				}
			});
			manager.initGroupDialog(treeWrap, createGroup);
			manager.initBranchDialog(treeWrap, createBranch);
			return this;
		},
		initGroupDialog: function(treeWrap, createGroup) {
			var	groupNameEle = $('.group-name', createGroup);
			var host = this.cache.setData.host;
			// 确认创建一个分组
			createGroup.find('.confirm-create-group').click(function() {
				var val = groupNameEle.val();
				val = $.trim(val), err = "";
				if (!val) {
					err = "分组名称是必须的"
				} else {
					treeWrap.find('dl[data-fun="group"] dt').each(function() {
						var txt = $(this).text();
						if (txt == val) {
							err = "已经有同名的分组存在"
							return false;
						}
					});
				}
				if (err) {
					alert(err);
				} else {
					manager.getTplByPath("/tpl/manager-menu.tpl", function(tpl) {
						var data = {
							groupName: val
						};
						host.push(data);
						var html = $.template(tpl, [data]);
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
			var	groupNameEle = $('.group-name', createBranch),
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
				var err = "", gEle, item, status = false,
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
				treeWrap.find('dl[data-fun="group"] dt').each(function() {
					var me = $(this);
					var val = $.trim(me.text());
					if (val == groupName) {
						gEle = me;
						return false;
					}
				});
				// 已经存在这个分组
				if (gEle) {
					item = gEle.closest('dl').find('dd.item');
					if (item && item.length) {
						item.find('dd[data-fun="project"]').each(function() {
							var val = $.trim($(this).text());
							if (val == branchName) {
								status = true;
								return false;
							} 
						});
						if (status) {
							alert('该分支已经存在');
							return;
						}
						tmp = manager.findGroup(groupName);
						if (tmp) {
							group = tmp.group;
							if (!group.branches ) {
								group.branches = [];
								manager.branchPos(item.find('dl')[0]);
							}
							group.branches.push({
								branchName: branchName
							})
							item.find('dl').append('<dd data-fun="project">' + branchName + 
								'<span class="glyphicon glyphicon-ban-circle dis-icon">'
								+ '</span><span class="glyphicon glyphicon-trash del-icon"></span></dd>')
							.find('dd[data-fun]:last').trigger('click');

						}
					}
				// 当前分组不存在
				} else {
					manager.getTplByPath("/tpl/manager-menu.tpl", function(tpl) {
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
						manager.branchPos(dl[0]);
					});
				}
				if (err) {
					alert(err);
					return;
				}
				createBranch.modal('hide');
			});
			return this;
		},
		// 左侧菜单交换位置
		navChangePos: function() {
			var sidebar = this.cache.sidebarEle;
			new Sortable(sidebar[0], {
				group: "group",
				sort: true,
				animation: 150,
				handle: "dt",
				ghostClass: "sortable-ghost",
				scroll: true,
				draggable: "dl"
			});
			sidebar.find('dl[data-fun="group"] dd.item dl').each(function() {
				manager.branchPos(element);
			});
			return this;
		},
		// 分支位置交换初始化方法
		branchPos: function(element) {
			new Sortable(element, {
				sort: true,
				animation: 150,
				ghostClass: "sortable-ghost",
				scroll: true,
				handle: "dd",
				draggable: "dd"
			});
			return this;
		},
		// 右侧panel上的事件
		initProjectPanelEvt: function() {
			var content = this.cache.panelEle;
			var html =	['<div class="form-group">',
							'<label class="col-md-1 control-label">路径</label>',
							'<div class="col-md-4">',
								'<input type="text" class="form-control" placeholder="请输入项目路径" name="codePath">',
							'</div>',
							'<label class="col-md-1 control-label">虚拟路径</label>',
							'<div class="col-md-4">',
								'<input type="text" class="form-control" placeholder="请输入虚拟路径" name="virtualPath">',
							'</div>',
							'<div class="col-md-2">',
								'<span class="glyphicon glyphicon-move move-icon"></span>',
								'<span class="glyphicon glyphicon-trash del-icon"></span>',
							'</div>',
						'</div>'].join('')
			content.on('click', '.create-path', function(e) {
				content.find('.form-wrap').append(html);
			});
			return this;
		},
		// 点击菜单后右侧panel初始化
		initProjectPanel: function(groupName, branchName) {
			manager.getTplByPath("/tpl/manager-content.tpl", function(tpl) {
				var data, html, tmp;
				tmp = manager.findBranch(groupName, branchName);
				data = $.extend({
					groupName: groupName,
					branchName: branchName
				}, tmp ? tmp.branch : null);
				html = $.template(tpl, data);
				manager.cache.panelEle.html(html);
			});
			return this;
		},
		// 更新面板的数据
		setCurrentPanelData: function() {
			var content = this.cache.panelEle,
				formGroup = content.find('.form-group'),
				groupName = content.find('.form-wrap').attr('data-group-name'),
				branchName = content.find('.form-wrap').attr('data-branch-name'),
				tmp,
				data = {};
			formGroup.each(function() {
				var me = $(this),
					inputs = me.find('input'),
					one = {};
				inputs.each(function() {
					if (this.value) {
						if(this.name == 'basePath') {
							data.basePath = this.value.replace(/\\/g, "/");
						} else {
							one[this.name] = this.value.replace(/\\/g, "/");
						}
					}
				});
				if (!$.isEmptyObject(one)) {
					data.val = data.val || [];
					data.val.push(one);
				}
			});
			tmp = manager.findBranch(groupName, branchName);
			if (tmp && tmp.branch) {
				$.extend(tmp.branch, data);
			}
			return this;
		},
		// 找到一个分组
		findGroup : function(groupName) {
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
			var retVal = null, tmp, group;
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
		getTplByPath: function(path, callBack) {
			manager.cache.tpl = manager.cache.tpl || {};
			if (manager.cache.tpl[path]) {
				callBack(manager.cache.tpl[path]);
			} else {
				$.get(window.cdnBaseUrl + path, function(data, status) {
					if (data && status == "success") {
						callBack(data);
						manager.cache.tpl[path] = data;
					} else {
						alert("路径为" + path +"的模板载入错误");
					}
				});
			}
			return this;
		},
		// 保存
		initSave: function() {
			$('.save').click(function(e) {
				//先将当前面版中的数据更新到setData中去
				manager.setCurrentPanelData();
				$.post(baseUrl + 'sys/set_config_ajax.html', {
					data: JSON.stringify(manager.cache.setData)
				}).then(function(data) {
					if (data == 1) {
						alert("服务器配置更新成功");
					} else {
						alert("服务器配置失败");
					}
				}, function() {
					alert("系统忙，请稍后在试试");
				});
			});
			return this;
		}
	};
	manager.init();
	window.manager = manager;
})(jQuery);