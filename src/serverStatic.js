
// 转义html
// var escapeHtml = require('escape-html');
// object对象合并模块
// var merge = require('utils-merge');
// 解析url模块
var parseurl = require('parseurl');
var path = require('path');
var log = require('../src/log');
var parsePath = require('../src/parsePath');

var fontsFileExt = ["eot", "svg", "ttf", "woff"];
var excludeFileExt = ["ftl", "ejs", "jsp"];

exports = module.exports = function serveStatic() {
  return function serveStatic(req, res, next) {
	// 如果不是get请求或者 是head， 就直接到下一个请求
	if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== "POST") {
	  return next()
	}
	var url  = parseurl(req);
	// 获取路径
	var pathname = path.normalize(url.pathname);
	var ext = path.extname(pathname).replace('.', "");
	var absPath, headers, pathObject;
	ext = ext.toLowerCase();
	if (ext && !~excludeFileExt.indexOf(ext)) {
		try{
			pathObject = parsePath(pathname);
			if (pathObject && pathObject.fullPath) {
				absPath = pathObject.fullPath;
				res.location(pathname);
				headers = {"Full-Path": absPath}
				// 字体文件
				if (~fontsFileExt.indexOf(ext)) {
					headers['Access-Control-Allow-Origin'] = "*";
				}
				// 渲染文件
				return res.sendFile(absPath, {
					headers: headers
				}, function(){});
			} else {
				res.status(404);
				res.render("404", {
					message: '没有找到对应的文件,请查看server.json配置文件,当前文件相对路径' +  pathname
				});
			}
		}catch(e) {
			next(e);
		}
	} else {
		next();
	}
  }
}
