/**
 * 设置 页面中的xmlHttpRequest对象
 * 将请求拦截到指定的/___mySystemInner/sys/get.html上
 * 系统通过这个url代理所有的ajax请求代理到指定的站点
 */
(function(win){
	var proto;
	if (win.XMLHttpRequest) {
		proto = win.XMLHttpRequest.prototype;
	}
	//低版本ie系列
	if (win.ActiveXObject) {
		proto = win.ActiveXObject.prototype;
	}
	//保存open方法
	var open = proto.open;
	//覆盖open方法
	proto.open = function (type, url, async, username, password) {
		//修改url发送到指定位置
		url = win.location.protocol + "\/\/" + 
		win.location.host + 
		'/___mySystemInner/sys/proxyAjax.html?url=' + 
		encodeURIComponent(url) +
		"&mainPage=" + window.location.href;
		//继续发送
		open.call(this, type, url, async, username, password);
	};
})(window);

