// 转义html
// var escapeHtml = require('escape-html');
// object对象合并模块
var merge = require('utils-merge');
// 解析url模块
var parseurl = require('parseurl');
var path = require('path');
var log = require('../src/log');
var fs = require('fs');
var parsePath = require('../src/parsePath');
var Promise = require('bluebird');
var less = require('less');
var fse = require('fs-extra');
exports = module.exports = function lessParse() {
	return function (req, res, next) {
		var url = parseurl(req);
		// 获取路径
		var pathname = path.normalize(url.pathname);
		var dirname = path.dirname(pathname);
		var basename = path.basename(pathname);
		var ext = path.extname(pathname).replace('.', "") || "";
		var newpathname;
		var pathObject;
		var lessPath = "apache/less";
		var cssPath = "apache/css2";
		var tmp;
		ext = ext.toLowerCase();
		if (ext && ext == "css") {
			if (false) {
				parseToCurrent(dirname, basename, res, next);
			}
			if (lessPath && cssPath) {
				parsePath(pathname, function (rootPath, fullPath, codePath, shortPath) {
					lessPath = path.resolve(rootPath, lessPath);
					cssPath = path.resolve(rootPath, cssPath);
					var reg = new RegExp(["^", cssPath].join('').replace(/\\/g, "\\\\"));
					log.debug(rootPath, codePath, shortPath, fullPath);
					if (reg.test(fullPath)) {
						tmp = fullPath.replace(reg, "").replace(/.css$/, ".less");
						log.debug(tmp);
						tmp = path.join(lessPath, tmp);
						log.debug(tmp);
						//找到了对应的less文件
						if (fs.existsSync(tmp)) {
							parseLess(tmp, fullPath, res, next);
							return true;
						}
					}
				});
			}
		} else {
			next();
		}
	}
};

var parseToCurrent = function (dirname, basename, res, next) {
	newBasename = basename.replace(/.css$/, ".less");
	var newpathname = path.join(dirname, newBasename);
	pathObject = parsePath(newpathname);
	if (pathObject) {
		// 读取less文件
		parseLess(pathObject.fullPath, pathObject.fullPath.replace(/.less$/, ".css"), res, next);
	}
};

var parseLess = function (lessFullPath, cssFullPath, res, next) {
	// 读取less文件
	var content = fs.readFileSync(lessFullPath);
	// 解析less文件没有带sourcemap
	less.render(content.toString(), {filename: lessFullPath})
		// 成功解析
		.then(function (output) {
			try {
				fse.outputFile(cssFullPath, output.css, function(err){
					if (err) {
						next(err);
					} else {
						next();
					}
				});
			} catch (err) {
				log.error(err);
				res.set('Content-Type', "text/html; charset=UTF-8");
				res.render("500.ejs", {
					message: "less 写文件出错" + err.message
				});
				return;
			}
			// 解析失败
		}, function (err) {
			log.error(err);
			res.set('Content-Type', "text/html; charset=UTF-8");
			res.render("500.ejs", {
				message: "less 解析出错：" + err.message
			});
		});
};
