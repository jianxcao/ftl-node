
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
var jarFilePath = path.join(__dirname, "../lib/jar/ftl.jar");
var spawn = require('child_process').spawn;
var Promise = require('bluebird');
var iconv = require('iconv-lite');
var merge = require('utils-merge');
var fse = require('fs-extra');
var consoleErrors = [];
exports = module.exports = function serveFtl(port) {
  return function serveFtl(req, res, next) {
	//  重置错误提示
	consoleErrors = [];
	var url  = parseurl(req);
	var port = req.app.get("port");
	var fullUrl = req.protocol + '://' + req.get('host') +  req.path;
	// 获取路径
	var pathname = path.normalize(url.pathname);
	var ext = path.extname(pathname).replace('.', "");
	var fullPath, pathObject;
	var webPort = port;
	var tmpFilePaths;
	//  需要在控制台输出的错误
	//其内的每个元素是一个 object，object包括  message属性和 stack属性
	ext = ext.toLowerCase();
	if (ext && ext == "ftl") {
		try{
			pathObject = parsePath(fullUrl);
			if (pathObject) {
				//	回收生成的临时文件
				req.on('close', function () {
					deleteFiles(tmpFilePaths);
				});
				req.on('end', function () {
					deleteFiles(tmpFilePaths);
				});
				fullPath = pathObject.fullPath;
				res.location(pathname);
				res.set('Full-Path', fullPath);
				tmpFilePaths = [];
				// 获取全局的ftl假数据
				getFtlData()
				// 解析里面所有的include，模拟出假数据
				.then(function(data) {
					pathObject.newFullPath = parseInclude(fullPath, tmpFilePaths, req, res);
					var newPath = pathObject.newFullPath.replace(pathObject.basePath, "");
					pathObject.newPath = newPath;
					return data;
				})
				// 获取res中的一些数据
				.then(function(data) {
					return getReq(req, data, webPort);
				})
				// 调用java解析ftl
				.then(function(data) {
					return parseFtl(res, pathObject.basePath, pathObject.newPath, data, {}, tmpFilePaths);
				})
				.catch(function(err) {
					if (typeof err == "string") {
						err = new Error(err);
					}
					next(err);
				});
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
  };
};

// 获取ftl数据
var getFtlData = function() {
	return new Promise(function(resolve, reject) {
		resolve({ENV: "local_dev"});
	});
};

/**解析所给当前文件路径中所有关于并返回数组表示当前页面解析到的地址和类型
 * <#include "../../inc/core.ftl">
 * <#import "../dhxy2013/inc/baseModule.ftl" as lottery>
 * <#mock "../dhxy2013/inc/baseModule.js">
 * @fullPath String ftl全路径
 * **/
var parseInclude = function(fullPath, tmpFilePaths, req, res) {
	if (!tmpFilePaths ) {
		tmpFilePaths = [];
	}
	// 如果创建新的文件并替换则会产生一个新的path
	var newPath;
	var pathResult = path.parse(fullPath);
	var dirname = pathResult.dir;
	var newFileContent = null;
	try{
		var reg = /(<#--\s*){0,1}(?:<#){0,1}(include|import|mock)\s+(?:"|')([^"'\s]+)(?:"|')(?:\s+as\s+([^\s>]+)){0,1}\s*(?:>){0,1}(\s*-->){0,1}/g;
		var bian = /^\$\{.*\}$/;
		var one;
		var command;
		var currentPath;
		var currentAbsolutePath;
		var tmp;
		var fileContent = fs.readFileSync(fullPath, {
			encoding: "utf8"
		});
		newFileContent = fileContent;
		while ((one = reg.exec(fileContent)) !== null) {
			command = one[2];
			currentPath = one[3];
			//存在路径和命令，并且路径不是写死的
			if (command && currentPath && !bian.test(currentPath)) {
				//import和include指令代表要引入ftl
				if (command === "import" || command === "include") {
					//如果 import和include指令是注释的就不解析
					if (!one[1]) {
						currentAbsolutePath = path.resolve(dirname, currentPath);
						var includePath = parseInclude(currentAbsolutePath, tmpFilePaths, req, res);
						//path发生变化，证明引入的ftl中有假数据
						if (includePath !== currentAbsolutePath) {
							//用生成的临时文件代替当前文件路径
							tmp = one[0].replace(currentPath, path.relative(dirname, includePath));
							tmp = tmp.replace(/\\/g, "/");
							newFileContent = newFileContent.replace(one[0], tmp);
						}
					}
				// 如果需要mock假数据就生成一个临时的文件，去替换当前的文件
				} else if (command == "mock") {
					var data = getOneModuleData(path.resolve(dirname, currentPath), req, res);
					var dataString = parseToFtlData(data);
					newFileContent = newFileContent.replace(one[0], dataString);
				}
			}
		}
		//文件内容需要发生变化
		if (newFileContent !== fileContent) {
			newPath = path.join(dirname, pathResult.name + "__tmp" + new Date().getTime() + pathResult.ext);
			tmpFilePaths.push(newPath);
			createFile(newFileContent, newPath);
			return newPath;
		}
	}catch (err){
		log.error(err);
	}
	return fullPath;
};
// 创建文件并返回path
var createFile = function(content, filePath) {
	try{
		fse.outputFileSync(filePath, content);
	}catch(err) {
		log.error(err);
	}
};
//删除文件
var deleteFiles = function(filePaths) {
	try{
		if (filePaths && filePaths.length) {
			var i = 0;
			while(filePaths.length) {
				fse.removeSync(filePaths[0]);
				i = i+1;
				filePaths.shift();
			}
		}
	} catch(err) {
		log.error(err);
	}
};
// 将data接卸成ftl数据的格式
var parseToFtlData = function(data) {
	var html = [];
	var parseValue =function(k, value) {
		if (typeof value === 'object') {
			for (var key in value) {
				if (value.hasOwnProperty(key)) {
					if (value[key] instanceof Date) {
						value[key] =  '__cjxDate1__' + formatTime(+value[key], "yyyy-MM-dd HH:mm:ss:S") +"__cjxDate2__";
					}
				}
			}
		}
		return value;
	};
	if (data && typeof data === "object") {
		for(var key in data) {
			html.push('<#assign ');
			html.push(key);
			html.push(' = ');
			if (data[key] instanceof Date) {
				html.push(['"', formatTime(+data[key], "yyyy-MM-dd HH:mm:ss:S"), '"', '?datetime("yyyy-MM-dd HH:mm:ss:S")'].join(''));
			} else {
				html.push(JSON.stringify(data[key], parseValue).replace(/"(?:__cjxDate1__)([^_]+)(?:__cjxDate2__)"/g, "\"$1\"?datetime(\"yyyy-MM-dd HH:mm:ss:S\")"));
			}
			html.push(" />");
			html.push("\n");
		}
	}
	return html.join('');
};
//格式化日期
var formatTime = function(timeNum, fmt) {
	timeNum = +timeNum;
	if (isNaN(timeNum)) {
		return timeNum;
	}
	var dd = new Date(timeNum);
	var o = {
		"M+": dd.getMonth() + 1, //月份 
		"d+": dd.getDate(), //日 
		"h+|H+": dd.getHours(), //小时 
		"m+": dd.getMinutes(), //分 
		"s+": dd.getSeconds(), //秒 
		"q+": Math.floor((dd.getMonth() + 3) / 3), //季度 
		"S": dd.getMilliseconds() //毫秒 
	};
	if (/(y+)/.test(fmt)) {
		fmt = fmt.replace(RegExp.$1, (dd.getFullYear() + "").substring(4 - RegExp.$1.length));
	}
	for (var k in o) {
		if (new RegExp("(" + k + ")").test(fmt)) {
			fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substring(("" + o[k]).length)));
		}
	}
	return fmt;
};
//获取引入的假数据
var getOneModuleData = function(fullPath, req, res) {
	var data = {};
	try{
		//如果当前模块存在就删除当前模块的缓存
		if (require.cache && require.cache[fullPath]) {
			delete  require.cache[fullPath];
		}
		var my = require(fullPath);
		if (typeof my === 'function') {
			my = my(req, res);
		}
		if (typeof my === "object") {
			data = my;
		}
	}catch(err) {
		log.error(err.message);
		err.message = "假数据解析出错：    " + err.message;
		consoleErrors.push(err);
	}
	return data;
};
// 增加req
var getReq = function(req, data, webPort) {
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

/**
 *
 * @param res request请求对象
 * @param rootPath 解析ftl的根路径
 * @param ftlPath ftl的相对路径
 * @param data ftl需要的全局假数据
 * @param option  解析ftl的option
 * @param tmpFilePaths 生成的临时ftl的所有路径 (主要是如果这个ftl报错了，需要把路径替换成 真正的flt)
 * @returns {*}
 */
var parseFtl = function(res, rootPath, ftlPath, data, option, tmpFilePaths) {
	var cmd;
	var stdout;
	var stderr;
	data = JSON.stringify(data, function(current, value) {
		if (typeof value == 'object') {
			for (var key in value) {
				if (value.hasOwnProperty(key)) {
					if (value[key] instanceof Date) {
						value[key] = "CJX_DATE: " + value[key].getTime();
					}
				}
			}
		}
		return value;
	});
	ftlPath = ftlPath.replace(/^\\/, "");
	option = merge({
		dir: rootPath,
		path: ftlPath
	}, option);
	option = JSON.stringify(option);
	cmd = spawn('java', ["-jar", jarFilePath, option, data]);
	stdout = cmd.stdout;
	stderr = cmd.stderr;
	Promise.props({
	    rightData: new Promise(function(resolve) {
				var rightData = "";
				stdout.on('data', function(chunk) {
					rightData += chunk.toString();
				})
				.on('end', function() {
					resolve(rightData);
				});
			}),
	    wrongData: new Promise(function(resolve) {
				var wrongData = "";
				stderr.on("data", function(chunk) {
					wrongData += iconv.decode(chunk, 'GBK');
				}).on('end', function() {
					resolve(wrongData);
				});
			})
	})
	.then(function(data) {
		if (data.rightData) {
			var finalData = data.rightData;
			var reg = /<\/body>/;
			var message = data.wrongData.replace(/"|'|\\/g, "\\$&").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
			tmpFilePaths.forEach(function(val) {
				val = path.basename(val);
				var realVal = val.replace(/^(.*)__tmp.*.ftl$/, "$1.ftl");
				var reg = new RegExp(val,"g");
				message = message.replace(reg, realVal);
			});
			var messages = message.split(/\\r\\n/);
			var consoleError='<script> if (window.console && console.log && console.group) {'+ getFtlConsoleErrorString(messages) + getConsoleErrors() + '}  </script>';
			reg.test(finalData) ? (finalData = finalData.replace(reg, consoleError + "</body>")) : (finalData += consoleError);
			res.send(finalData);
		} else {
			// 没有错误ftl输出为空
			if (!data.wrongData) {
				res.send(data.rightData);
			} else {
				res.render("500", {
					message: ['<div>', data.wrongData.replace(/\n/g, "<br>"), '</div>'].join('') || "ftl解析错误"
				});
			}
		}
	});
};
//将ftl错误解析后扔到console。log中去
var getFtlConsoleErrorString = function(messages) {
	var result;
	result = messages.map(function(val, index, com) {
		var retVal = '', tmp;
		if (val) {
			if (val.indexOf("freemarker.log.JDK14LoggerFactory$JDK14Logger") >= 0) {
				if (index !== 0) {
					retVal += "console.groupEnd();";
				}
				if (messages[index + 1]) {
					tmp = messages[index + 1];
					val = val.replace('freemarker.log.JDK14LoggerFactory$JDK14Logger error', tmp);
					messages[index + 1] = '';
				}
				retVal += "console.groupCollapsed(\"%c" + val + "\", \"color:#f51b1b\");";
			} else {
				retVal = "console.log(\"%c" + val + "\", \"color:#f51b1b\");";
			}
		}
		return retVal;
	});
	if (result.length) {
		result.push('console.groupEnd();');
	}
	return result.join("");
};
//向控制台输出错误
var getConsoleErrors = function() {
	if (consoleErrors && consoleErrors.length) {
		return	consoleErrors.map(function(current) {
			if (current.message && current.stack) {
				return ["console.groupCollapsed('%c", current.message.replace(/"|'|\\/g, "\\$&").replace(/\n/g, "\\n").replace(/\r/g, "\\r"), "', 'color:#f51b1b');",
					"console.log('%c", current.stack.replace(/"|'|\\/g, "\\$&").replace(/\n/g, "\\n").replace(/\r/g, "\\r"), "', 'color:#f51b1b');",
					"console.groupEnd();"].join('');
			}
		}).join('');
	}
	return "";
};
