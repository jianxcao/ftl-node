var url = require('url');
var querystring = require('querystring');

exports = module.exports = function() {
	return function(req, res, next) {
		if (req.pathObject) {
			var urlObj = url.parse(req.url);
			res.set('Real-Ip', req.ip);
			res.location(urlObj.pathname);
			res.set('Full-Path', querystring.escape(req.pathObject.fullPath));
			next();
		} else {
			res.status(404);
			res.render("404", {
				message: "没有找到路径, 文件路径," + req.originalUrl
			});
		}
	};
};
