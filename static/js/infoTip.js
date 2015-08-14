define(["jquery", "tpl"], function($) {
	return {
		/**
		 *  打开一个提示
		 * @param type {number}弹窗类型 1表示成功 0表示警告
		 * @param msg 消息内容，可以是html字符传
		 * @param closeTime {number} 不传递或者 值为0就表示不关闭一直提示
		 */
		alertTip: function(type, msg, closeTime) {
			var tpl = '<div class="fade in alert alert-<%=data.type%> tip"><%=data.msg%></div>';
			var tipArea = $('.tipArea');
			var html, ele;
			if (!tipArea.length) {
				$('body').append('<section class="tipArea"></section>');
			}
			tipArea = $('.tipArea');
			closeTime = +closeTime;
			if (typeof type === "string") {
				closeTime = msg;
				msg = type;
				type = 1;
			}
			html = $.template(tpl, {
				type: type == 1 ? "success" : "warning",
				msg: msg
			});
			ele = $(html).appendTo(tipArea).alert();
			if (closeTime) {
				window.setTimeout(function() {
					ele.alert("close");
				}, closeTime);
			}
		},
		toast: function(type, msg) {
			if (typeof type === "string") {
				msg = type;
				type = 1;
			}
			this.alertTip(type, msg, 5000);
		},
		wrongToast: function(msg) {
			this.toast(0, msg || "系统忙，请稍后在试试");
		}
	};
});
