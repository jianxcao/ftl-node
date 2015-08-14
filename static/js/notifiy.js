// 通知
// 基于websocket
define(["jquery", "js/console"], function($, myConsole) {
	var notifiy = {
		init: function() {
			var host = window.document.location.host.replace(/:.*/, '');
			var ws = new WebSocket('ws://' + host);
			this.ws = ws;
			this.initEvent();
		},
		initEvent: function() {
			var com = this;
			var ws = this.ws;
			ws.addEventListener("open", function() {
				console.log('socket服务器开启');
			}, false);
			ws.addEventListener('message', function(event) {
				var data = event.data;
				try{
					data = JSON.parse(data);
					com.send(data);
				}catch (e) {
					// console.error("服务器发送了一个未知的消息:" + data);
				}
			}, false);
			// 监听Socket的关闭
			ws.addEventListener('close', function() {
				console.log('socket服务器关闭');
			});
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
