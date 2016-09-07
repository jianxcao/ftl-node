
// 转义html
// var escapeHtml = require('escape-html');
// object对象合并模块
// var merge = require('utils-merge');
// 解析url模块
var parseurl = require('parseurl');
var path = require('path');
var parsePath = require('../src/parsePath');
var querystring = require('querystring');

exports = module.exports = function parsePageUrl() {
  return function(req, res, next) {
	var url  = parseurl(req);
	var fullUrl = req.protocol + '://' + req.get('host') + req.path;
	// 获取路径
	var pathname = path.normalize(url.pathname);
	res.set('Real-Ip', req.ip);
	res.location(pathname);
	parsePath(fullUrl)
	.then(function(pathObject) {
		res.set('Full-Path', querystring.escape(pathObject.fullPath));
		req.pathObject = pathObject;
		next();
	}, function(err) {
		res.status(404);
		res.render("404", {
			message: err + "----" + pathname
		});
	});
  };
};
