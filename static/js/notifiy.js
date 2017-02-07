// 通知
// 基于websocket
define(["jquery", "js/console", "io"], function($, myConsole, io) {
	var notifiy = {
		init: function() {
			var host = window.document.location.host;
			ws = io.connect('ws://' + host + "/ftl");
			this.ws = ws;
			this.initEvent();
		},
		initEvent: function() {
			var com = this;
			var ws = this.ws;
			ws.once('connect', function () {
				ws.on('message', function(data) {
					if (typeof data === 'string') {
						data = JSON.parse(data);
					}
					com.send(data);
				});				
			});
			
			ws.on('connect_timeout', ()=> {
				console.log('connect_timeout');
			});
			
			ws.on('reconnecting', ()=> {
				console.log('reconnecting');
			});
			
			ws.on('connect_error', () => {
				console.log('connect error');
			});
			
			ws.on('close', () => {
				ws = null;
				console.log('ws关闭'); 
			});

			ws.on('error', err => console.error(err));			
		},
		/**
		 * 发送一个消息，消息的格式是
		 * @param messageObj
		 * {
		 *  type: error, info
		 *  title: 消息头部{可以是空}
		 *  message: 消息体,
		 *  branchName 分支名称
		 *  groupName 分组名称
		 * }
		 * 如果存在 分支名称和分组名称则消息会被强制放入这个里面，如果不存在这个元素就会不输出这个消息
		 */
		send: function(messageObj) {
			var reg = /\n/g;
			var time = /^\[.*\]$/;
			var end = /<br>$/;
			if (messageObj.title) {
				messageObj.title = messageObj.title.trim();
				messageObj.title = safeHTML(messageObj.title);
				messageObj.title = messageObj.title.replace(reg, "<br>");
				if (!end.test(messageObj.title) && !time.test(messageObj.title)) {
					messageObj.title += "<br>";
				}
			}
			if (messageObj.message) {
				messageObj.message = messageObj.message.trim();
				messageObj.message = safeHTML(messageObj.message);
				messageObj.message = messageObj.message.replace(reg, "<br>");
				if (!end.test(messageObj.message) && !time.test(messageObj.message)) {
					messageObj.message += "<br>";
				}
			}
			myConsole.show();
			myConsole.out(messageObj);
		}
	};
	var	safeHTML = function( str ){
		return String(str)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");
	};
	notifiy.init();
	return notifiy;
});
