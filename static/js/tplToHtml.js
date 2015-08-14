define(["jquery", "config", "tpl"], function($, config) {
	var cache = {};
	return function(tplPath, data) {
		var d = $.Deferred();
		if (cache[tplPath]) {
			d.resolve($.template(cache[tplPath], data));
			return d;
		} else {
			return $.get(config.cdnBaseUrl + tplPath)
				.then(function(tplString) {
					cache[tplPath] = tplString;
					return $.template(tplString, data);
				}, function() {
					console.error("路径为" + tplPath + "的模板载入错误");
				});
		}
	};
});
