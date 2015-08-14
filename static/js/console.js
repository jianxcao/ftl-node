/*
 *页面控制台的产生，及输入html切换等方法
*/
define(["jquery", "js/tplToHtml", "lib/scrollBar/scrollBar"], function($, tplToHtml, scrollBar) {
	var def = tplToHtml("/tpl/console.tpl", {});
	var ps;
	var messageLength = 0;
	var initScrollBar = function(container) {
		container.perfectScrollbar(); 
	};
	var updateScrollBar = function() {
		myConsole.getConsoleArea().then(function(consoleArea) {
			consoleArea.find('.panel-body').perfectScrollbar("update");
		});
	};
	var myConsole =  {
		// 返回promise对象，then参数是个jquery的对象
		getConsoleArea: function() {
			return def
			.then(function(html) {
				var consoleArea = $('.consoleArea');
				if (!consoleArea.length) {
					html = $(html);
					consoleArea = html;
					html.appendTo($('body'));
					initScrollBar(consoleArea.find('.panel-body'));
				}
				return consoleArea;
			});
		},
		/*
		 * @param opt
		 * {
		 *  type: "err" | "error" | "log" 默认是log
		 *  title: "消息头部"
		 *  message: "信息内容"
		 *  groupName : "分组名称"
		 *  branchName : "分支名称"
		 * }
		 *
		 */
		out: function(opt) {
			if (opt && opt.message || opt.title) {
				this.getConsoleArea()
				.then(function(consoleArea) {
					return tplToHtml("/tpl/oneLog.tpl", opt)
					.then(function(html) {
						return {
							dom:consoleArea,
							html: html
						};
					});
				})
				.then(function(result) {
					var area = result.dom.find('.consoleBox');
					var panel = result.dom.find('.panel-body');
					area.append(result.html);
					panel[0].scrollTop = panel[0].scrollHeight;
					panel.perfectScrollbar("update");
					messageLength += 1;
					if (messageLength > 100) {
						area.find('>span:eq(0)').remove();
					}
				});
			}
		},
		log: function(message, title, groupName, branchName) {
			this.out({
				message: message,
				title: title,
				groupName: groupName,
				branchName: branchName
			});
		},
		err: function(message, title, groupName, branchName) {
			this.out({
				message: message,
				title: title,
				groupName: groupName,
				branchName: branchName
			});
		},
		// 显示日志模块
		show: function() {
			this.getConsoleArea().then(function(consoleArea) {
				consoleArea.show();
			});
		},
		// 最小化日志模块
		min: function() {
			this.getConsoleArea().then(function(consoleArea) {
				consoleArea.addClass('min');
				$('body').css("overflow", "");
			});
		},
		// 正常大小日志模块
		normal: function() {
			this.getConsoleArea().then(function(consoleArea) {
				consoleArea.removeClass('min max');
				$('body').css("overflow", "");
			});
		},
		// 最大化日志模块
		max: function() {
			this.getConsoleArea().then(function(consoleArea) {
				consoleArea.removeClass('min').addClass('max');
			});
		},
		// 隐藏日志模块
		hide: function() {
			this.getConsoleArea().then(function(consoleArea) {
				consoleArea.hide();
			});
		},
		clear: function() {
			this.getConsoleArea().then(function(consoleArea) {
				var area = consoleArea.find('.consoleBox');
				area.html('');
				messageLength = 0;
			});			
		}
	};
	myConsole.getConsoleArea()
	.then(function(consoleArea) {
		consoleArea
		.on('click', ".console-clear", function() {
			myConsole.clear();
		})
		.on("click", ".console-min", function() {
			myConsole.min();
		})
		.on("click", ".console-size", function() {
			if (consoleArea.hasClass('max')) {
				myConsole.normal();
			} else {
				$('body').css("overflow", "hidden");
				myConsole.max();
			}
		})
		.on("click", ".console-close", function() {
			myConsole.min();
		})
		.on('click', ".minBtn", function() {
			consoleArea.removeClass("min");
			if (consoleArea.hasClass('max')) {
				$('body').css("overflow", "hidden");
			}
		});
	});
	return myConsole;
});
