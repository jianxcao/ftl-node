// 解析目录，将目录解析成一个html文件，方便访问
// 解析url模块
var parseurl = require('parseurl');
var path = require('path');
var fs = require('fs');
var Promise = require('bluebird');
var log = require('../src/log');
var parsePath = require('../src/parsePath');
exports = module.exports = function serveStatic() {
  return function serveStatic(req, res, next) {
	// 如果不是get请求或者 是head， 就直接到下一个请求
	if (req.method !== 'GET' && req.method !== 'HEAD') {
	  return next();
	}
	var url  = parseurl(req);
	var port = req.app.get("port");
	var fullUrl = req.protocol + '://' + req.get("host") + ( port == 80 || port == 443 ? '' : ':'+ port ) + req.path;
	// 获取路径
	var pathname = path.normalize(url.pathname);
	var ext = path.extname(pathname).replace('.', "");
	var absPath, headers;
	ext = ext.toLowerCase();
	// 没有ext证明是个路径，而不是个文件
	if (!ext) {
		try{
			pathObject = parsePath(fullUrl);
			if (pathObject && pathObject.fullPath) {
				absPath = pathObject.fullPath;
				// log.debug(absPath, 'absPath');
				// 第一步去读取文件类型
				new Promise(function(resolve, reject) {
					fs.lstat(absPath, function(err, status) {
						if (err) {
							reject(err);
						} else {
							if (status.isDirectory()) {
								resolve();
							} else {
								reject("当前文件类型不是一个目录");
							}
						}
					});
				// 第一步成功后，第二部去读取目录下的所有文件的文件名称
				}).then(function() {
					return new Promise(function(resolve, reject) {
						fs.readdir(absPath, function(err, files) {
							if (err) {
								reject(err);
							} else {
								resolve(files);
								// log.debug(files);
							}
						});
					});
				// 第三部根据文件名循环遍历得到文件信息
				}).then(function(files) {
					return getFileInfo(files, absPath);
				// 第四部渲染页面
				}).then(function(filesInfo){
					res.set('Full-Path', absPath);
					res.render("list", {
						url: req.url,
						data: filesInfo
					});
				}).catch(function(e){// 出错，直接抛出到页面
					if (typeof (e) == "string") {
						e = new Error(e);
					}
					log.error(e);
					next(e);
				});
			} else {
				res.status(404);
				res.render("404", {
					message: '没有找到对应的路径,请查看server.json配置文件,当前文件相对路径' +  pathname
				});
			}
		}catch(e) {
			next(e);
		}
	} else {
		next();
	}
  };
};


/*
*  读取指定列表的所有文件的文件信息
* @param {Array} files
* @return {Array} 返回一个带有每个文件描述的数组列表 如[{name: "", size: "", mtime: ""}]
*/
var getFileInfo = function(files, basePath) {
	var index = 0;
	var get = function(result) {
		if (!files || !files.length || !files[index]) {
			return new Promise(function(resolve) {
				resolve(result);
			});
		} else {
			return new Promise(function(resolve, reject) {
				var one = files[index];
				index = index + 1;
				fs.lstat(path.resolve(basePath, one), function(err, status) {
					// 当前目录如果读取错误，直接忽略
					if (err) {
						resolve(result);
					} else {
						result.push({
							name: one,
							size: status.size,
							mtime: status.mtime
						});
						resolve(result);
					}
				});
			}).then(get);
		}
	};
	return get([]);
};
