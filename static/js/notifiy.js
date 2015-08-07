// 通知
// 基于websocket
(function($) {
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
				console.log(data);
				try{
					data = JSON.parse(data);
					com.send(data);
				}catch (e) {
					console.log("aaaaaaaa", e);
					//console.error("%c", "服务器发送了一个未知的消息:" + data, "color:#f51b1b");
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
			var area = this.getMessageArea(messageObj.groupName, messageObj.branchName);
			var tmpl =  '<p <%if (data.type=="error") {%>class="err"<%} else {%>class="info"<%}%>><%=data.title|| ""%><br><%=data.message || ""%></p>';
			if (area && area.length) {
				console.log(messageObj.message);
				html = $.template(tmpl, messageObj);
				area.append(html);
				area[0].scrollTop = area[0].scrollHeight;
			}
		},
		getMessageArea: function(groupName, branchName) {
			var area = groupName && branchName ? $('body .bodyMessage') : $('body .bodyMessage');
			var tmpl = ['<div <%if (data.groupName && data.branchName){%>class="messageArea bodyMessage"<%} else {%>class="messageArea bodyMessage" groupName="<%=data.groupName%>" branchName="<%=data.branchName%>" <%}%>>',
				"</div>"].join('');
			var html;
			if (!area.length) {
				html = $.template(tmpl, {
					groupName: groupName,
					branchName: branchName
				});
				area = $(html);
				$('body').append(area);
			}
			return area;
		}
	};
	notifiy.init();
	window.notifiy =  notifiy;
})(window.jQuery);
