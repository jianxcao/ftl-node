
// 转义html
// var escapeHtml = require('escape-html');
// object对象合并模块
var merge = require('utils-merge');
// 解析url模块
var parseurl = require('parseurl');
var path = require('path');
var log = require('../src/log');
var fs = require('fs');
var jsonCompressor = require('json-compressor');
var parsePath = require('../src/parsePath');
var jarFilePath = path.join(__dirname, "../lib/jar/ftl.jar");
var spawn = require('child_process').spawn;
var Promise = require('bluebird');
var util = require('util');
var iconv = require('iconv-lite');
exports = module.exports = function serveFtl(port) {
  return function serveFtl(req, res, next) {
	var url  = parseurl(req);
	// 获取路径
	var pathname = path.normalize(url.pathname);
	var ext = path.extname(pathname).replace('.', "");
	var fullPath, headers, pathObject;
	var webPort = port;
	ext = ext.toLowerCase();
	if (ext && ext == "ftl") {
		try{
			pathObject = parsePath(pathname);
			if (pathObject) {
				fullPath = pathObject.fullPath;
				res.location(pathname);
				res.set('Full-Path', fullPath);
				
				// 获取全局的ftl假数据
				// 暂时没有全局假数据
				// getFtlData()


				// 获取res中的一些数据
				getReq(req, {ENV: "local_dev"}, webPort)
				// 调用java解析ftl
				.then(function(data) {
					return parseFtl(res, pathObject.basePath, pathObject.path, data, {});
				})
				.catch(function(err) {
					if (typeof err == "string") {
						err = new Error(err);
					}
					next(err);
				})
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

// 获取ftl数据
getFtlData = function() {
	return	new Promise(function(resolve, reject) {
		// 获取全局的ftl配置数据
		var ftlDataFileName = "";
		if (!ftlDataFileName) {
			log.info('必须配置假数据路径');
			resolve({});
		}
		// 加工配置文件路径
		ftlDataFileName = path.resolve(__dirname, ftlDataFileName);
		fs.readFile(ftlDataFileName, {encoding: "UTF-8", flag: "r"}, function(err, data) {
			if (err) {
				reject(err)
			} else {
				try{
					data = JSON.parse(jsonCompressor(data));
					resolve(data);
				}catch(e) {
					reject(err);
				}
			}
		});
	});
};
// 增加req
getReq = function(req, data, webPort) {
	return new Promise(function(resolve, reject) {
		var headers = req.headers;
		var myHeaders = {}, k;
		for(var key in headers) {
			k = key.replace(/^.{1}|-(\w)/g, function(all) {
				return all.toUpperCase();
			});
			myHeaders[k] = headers[key];
		}
		resolve(merge({
			request: {
				headers: myHeaders,
				body: req.body,
				query: req.query,
				hostname: req.hostname,
				pathname: req.path,
				protocol: req.protocol,
				httpVersion: req.httpVersion,
				port: webPort
			}
		}, data));
	});
};

// 解析ftl
parseFtl = function(res, rootPath, path, data, option) {
	var cmd;
		var stdout;
		var stderr;
		data = JSON.stringify(data);
		path = path.replace(/^\\/, "");
		option = merge({
			dir: rootPath,
			path: path
		}, option);
		option = JSON.stringify(option);
		cmd = spawn('java', ["-jar", jarFilePath, option, data]);
		stdout = cmd.stdout;
		stderr = cmd.stderr;
		stderr.setEncoding('UTF-8');
		new Promise(function(resove, reject) {
			var rightData = "";
			stdout.on('data', function(chunk) {
				rightData += chunk.toString();
			})
			.on('end', function() {
				resove(rightData);
			});
			
		}).then(function(rightData) {
			return new Promise(function(resolve, reject) {
				var wrongData = "";
				stderr.on("data", function(chunk) {
					// log.debug(chunk.isEncoding("UTF-8"), "hahahah");
					// wrongData += iconv.decode(chunk, 'win1251');
					wrongData += chunk.toString();
				}).on('end', function() {
					resolve({
						rightData: rightData,
						wrongData: wrongData
					});
				});
			});
		}).then(function(data) {
			if (data.rightData) {
				var finalData = data.rightData;
				var reg = /<\/body>/;
				var consoleError='<script> window.console && console.warn && console.warn("' + data.wrongData.replace(/"/g, "'").replace(/\n/g, "\\n").replace(/\r/g, "\\r") + '")</script>';
				if (data.wrongData) {
					reg.test(finalData) ? (finalData = finalData.replace(reg, consoleError + "</body>")) : (finalData+=consoleError);
				}
				res.send(finalData);
			} else {
				// 没有错误ftl输出为空
				if (!data.wrongData) {
					res.send(data.rightData);
				} else {
					res.render("500", {
						message: data.wrongData || "ftl解析错误"
					});
				}
			}
		});
};
