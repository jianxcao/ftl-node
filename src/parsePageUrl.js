
// 转义html
// var escapeHtml = require('escape-html');
// object对象合并模块
var path = require('path');
var parsePath = require('../src/parsePath');
var url = require('url');
var querystring = require('querystring');
var log = require('./log');
var fs = require('fs');
var tools = require('./tools');
var config = require('./config');
var ip = require('ip');
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
			pathname = urlObject.pathname;
		var cfg = config.get();
		var serverPort = !!isSecure ? cfg.httpsPort : cfg.port;
		var currentIp = hostname === 'localhost' ? "127.0.0.1" : hostname;
		req.isIp = ip.isV4Format(currentIp) || ip.isV6Format(currentIp);
		// hostname不一定是ip，如果不是ip就放过
		var isLocalIp = req.isIp && ip.isPrivate(currentIp);
		// 是否是本地ip
		req.isLocalIp = isLocalIp;
		// 当前服务器端口
		req.serverPort = serverPort;
		// 当前访问的端口-- 为代理时候会不同
		req.port = port;
		// 是否是安全协议
		req.isSecure = isSecure;
		// 当前协议
		req.protocol = protocol;
		// 获取路径
		pathname = path.normalize(pathname);
		parsePath(fullUrl)
			.then(function(pathObject) {
				var absPath = pathObject.fullPath;
				pathObject.ext = path.extname(pathObject.path).slice(1);
				// 已经有内容
				if (pathObject.content) {
					req.pathObject = pathObject;
					next();
				} else {
					fs.lstat(absPath, function(err, status) {
						if (err) {
							return next(tools.fileNotFoundErr('can not find ' + absPath));
						}
						pathObject.isDirectory = status.isDirectory();
						req.pathObject = pathObject;
						next();
					});
				}
			}, function(err) {
				next(err);
			});
	};
};
