
// 转义html
// var escapeHtml = require('escape-html');
// object对象合并模块
// var merge = require('utils-merge');
var path = require('path');
var parsePath = require('../src/parsePath');
var url = require('url');
var querystring = require('querystring');
var log = require('./log');
var fs = require('fs');
exports = module.exports = function parsePageUrl() {
	return function(req, res, next) {
		var isSecure = req.connection.encrypted || req.connection.pai,
			headers = req.headers,
			method = req.method,
			host = req.headers.host,
			hostname = host.split(':')[0],
			protocol = !!isSecure ? "https" : 'http',
			fullUrl = /^http.*/.test(req.url) ? req.url : (protocol + '://' + host + req.url),
			urlObject = url.parse(fullUrl),
			port = urlObject.port || (protocol === "http" ? '80' : '443'),
			pathStr = urlObject.path,
			pathname = urlObject.pathname,
			visitUrl = protocol + "://" + host + pathname;
		// 获取路径
		pathname = path.normalize(pathname);
		parsePath(fullUrl)
		.then(function(pathObject) {
			var absPath = pathObject.fullPath;
			fs.lstat(absPath, function(err, status) {
				if (err) {
					return next(err);
				}
				pathObject.isDirectory = status.isDirectory();
				req.pathObject = pathObject;
				next();
			});
		}, function(err) {
			next(err);
		});
	};
};
