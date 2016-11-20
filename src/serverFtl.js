
// 转义html
// var escapeHtml = require('escape-html');
// object对象合并模块
var merge = require('merge');
var path = require('path');
var log = require('../src/log');
var fs = require('fs');
var parseRemote = require('./parseRemote/parseRemoteMock');
var jarFilePath = path.join(__dirname, "../lib/jar/ftl.jar");
var spawn = require('child_process').spawn;
var Promise = require('promise');
var iconv = require('iconv-lite');
var fse = require('fs-extra');
var getProjectConfig = require('../src/getProjectConfig');
var setJarFile = require('../src/setJarFile');
var url = require('url');
var consoleErrors = [];
var getFtlData, parseInclude, createFile, deleteFiles,
	parseToFtlData, formatTime, getOneModuleData, getReq,
	parseFtl, getFtlConsoleErrorString, getConsoleErrors, 
	parseMatchInclude, parseOne, insertajaxMock;
var regStartslash = /^(\\|\/).+/;
exports = module.exports = function serveFtl(port) {
  	return function serveFtl(req, res, next) {
	//  重置错误提示
	consoleErrors = [];
	var isSecure = req.connection.encrypted || req.connection.pai;
	var host = req.headers.host;
	var protocol = !!isSecure ? "https" : 'http';
	var fullUrl = /^http.*/.test(req.url) ? req.url : (protocol + '://' + host + req.url);
	var	urlObject = url.parse(fullUrl);
	var webPort = urlObject.port || (protocol === "http" ? '80' : '443');
	var pathObject = req.pathObject;
	var ext = path.extname(pathObject.path).slice(1);
	var tmpFilePaths;
	var jarVersion = "";
	webPort = +webPort;
	//  需要在控制台输出的错误
	// 其内的每个元素是一个 object，object包括  message属性和 stack属性
	ext = ext.toLowerCase();
	if (ext && ext === "ftl") {
		try{
			Promise.resolve(pathObject)
			.then(function(pathObject) {
				var commandConfig = getProjectConfig(pathObject.groupName, pathObject.branchName);
				jarVersion = "";
				if (commandConfig && commandConfig.jarVersion) {
					jarVersion = commandConfig.jarVersion;
				}
				setJarFile(jarVersion, commandConfig.rootPath);
				//	回收生成的临时文件
				req.on('close', function () {
					deleteFiles(tmpFilePaths);
				});
				req.on('end', function () {
					deleteFiles(tmpFilePaths);
				});
				tmpFilePaths = [];
				return {
					pathObject: pathObject,
					commandConfig: commandConfig
				};
				// 获取全局的ftl假数据
			})
			.then(function(result) {
				return getFtlData()
				.then(function(data) {
					result.data = data;
					return result;
				});
			})
			// 解析里面所有的include，模拟出假数据
			.then(function(result) {
				var pathObject = result.pathObject;
				return parseInclude({
					basePath: pathObject.basePath,
					tmpFilePaths: tmpFilePaths,
					req: req,
					res: res,
					groupName: pathObject.groupName,
					branchName: pathObject.branchName
				}, pathObject.fullPath)
				.then(function(newFullPath) {
					pathObject.newPath = newFullPath.replace(pathObject.basePath, "");
					return result;
				});
			})
			// 获取res中的一些数据
			.then(function(result) {
				return getReq(req, result.data, webPort).then(function(data) {
					result.data = data;
					return result;
				});
			})
			// 调用java解析ftl
			.then(function(result) {
				var pathObject = result.pathObject;
				var data = result.data;
				var commandConfig = result.commandConfig;
				return parseFtl({
					tmpFilePaths: tmpFilePaths,
					rootPath: pathObject.basePath, 
					ftlPath: pathObject.newPath,
					req: req,
					res: res,
					data: data,
					// freemarker 版本大于等于2.3.24新增可以自动转码输出内容，该功能与 <#escape>标签相互冲突,使用后不能使用<#escape></#noescape>
					ftlFormat: !!commandConfig.ftlFormat
				}, !!commandConfig.isMockAjax);
			})
			.catch(function(err) {
				if (typeof err === "string") {
					err = new Error(err);
				}
				next(err);
			});
		} catch(e) {
			next(e);
		}
	} else {
		next();
	}
  };
};

// 获取ftl数据
getFtlData = function() {
	return new Promise(function(resolve) {
		resolve({ENV: "local_dev"});
	});
};

/** 解析所给当前文件路径中所有关于并返回数组表示当前页面解析到的地址和类型
 * <#include "../../inc/core.ftl">
 * <#import "../dhxy2013/inc/baseModule.ftl" as lottery>
 * <#mock "../dhxy2013/inc/baseModule.js">
 * @opt { 在递归中opt其实是共享的
 *	basePath ftl基础路径(设置的根路径)，配置项中生效的那个
 *	tmpFIlePaths 生成临时文件的存放位置
 *	req 
 * 	res
 * }
 *  dirname ftl所存放的跟路径
 *  fullPath ftl全路径
 * **/
parseInclude = function(opt, fullPath) {
	return new Promise(function(resolve) {
		opt.tmpFilePaths = opt.tmpFilePaths || [];
		var	tmpFilePaths = opt.tmpFilePaths;// 临时文件目录
		// 如果创建新的文件并替换则会产生一个新的path
		var newPath;
		var pathResult = path.parse(fullPath);
		var dirname = pathResult.dir;
		try{
			var reg = /(<#--\s*){0,1}(?:<#){0,1}(include|import|mock)\s+(?:"|')([^"'\s]+)(?:"|')(?:\s+as\s+([^\s>]+)){0,1}\s*(?:>){0,1}(\s*-->){0,1}/g;
			var one;
			var fileContent = fs.readFileSync(fullPath, {
				encoding: "utf8"
			});
			var p = Promise.resolve(fileContent);
			while ((one = reg.exec(fileContent)) !== null) {
				p = parseOne(p, opt, one, fileContent, dirname);
			}
			p = p.then(function(newFileContent) {
				// 文件内容需要发生变化
				if (newFileContent !== fileContent) {
					newPath = path.join(dirname, pathResult.name + "__tmp" + new Date().getTime() + pathResult.ext);
					tmpFilePaths.push(newPath);
					createFile(newFileContent, newPath);
					return newPath;
				} else {
					return fullPath;
				}
			});
			resolve(p);
		} catch (err){
			log.error(err);
		}
		resolve(fullPath);
	});
};
/**
 * 循环破解其中一个
 * @return {[type]} [description]
 */
parseOne = function(current, opt, matches, fileContent, dirname) {
	return current.then(function(fileContent) {
		return parseMatchInclude(opt, matches, fileContent, dirname);
	});
};

// 解析一个匹配的 include或者import或者 mock
parseMatchInclude = function(opt, matches, fileContent, dirname) {
	var basePath = opt.basePath;
	var command = matches[2];
	var currentPath = matches[3];
	var currentAbsolutePath;
	var tmp;
	var bian = /^\$\{.*\}$/;
	// 存在路径和命令，并且路径不是动态的路径
	if (!command || !currentPath || bian.test(currentPath)) {
		return Promise.resolve(fileContent);
	}
	// import和include指令代表要引入ftl
	if (command === "import" || command === "include") {
		// 如果 import和include指令是注释的就不解析
		if (!matches[1]) {
			if (regStartslash.test(currentPath)) {
				currentAbsolutePath = path.join(basePath, currentPath);
			} else {
				currentAbsolutePath = path.resolve(dirname, currentPath);
			}
			// 更新fullPath
			return parseInclude(opt, currentAbsolutePath)
			.then(function(includePath) {
				// path发生变化，证明引入的ftl中有假数据
				if (includePath !== currentAbsolutePath) {
					// 用生成的临时文件代替当前文件路径
					tmp = matches[0].replace(currentPath, path.relative(dirname, includePath));
					tmp = tmp.replace(/\\/g, "/");
					fileContent = fileContent.replace(matches[0], tmp);
				}
				return fileContent;
			});
		} else {
			return Promise.resolve(fileContent);
		}
	// 如果需要mock假数据就生成一个临时的文件，去替换当前的文件
	} else if (command === "mock") {
		return getOneModuleData({
			dirname: dirname,
			currentPath: currentPath,
			req: opt.req,
			res: opt.res,
			groupName: opt.groupName,
			branchName: opt.branchName
		})
		// 成功或者是把都返回数据
		.then(function(data) {
			var dataString = parseToFtlData(data);
			return fileContent.replace(matches[0], dataString);
		}, function() {
			return fileContent;
		});
	}
};
// 创建文件并返回path
createFile = function(content, filePath) {
	try{
		fse.outputFileSync(filePath, content);
	}catch(err) {
		log.error(err);
	}
};
// 删除文件
deleteFiles = function(filePaths) {
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
parseToFtlData = function(data) {
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
// 格式化日期
formatTime = function(timeNum, fmt) {
	timeNum = +timeNum;
	if (isNaN(timeNum)) {
		return timeNum;
	}
	var dd = new Date(timeNum);
	var o = {
		"M+": dd.getMonth() + 1, // 月份 
		"d+": dd.getDate(), // 日 
		"h+|H+": dd.getHours(), // 小时 
		"m+": dd.getMinutes(), // 分 
		"s+": dd.getSeconds(), // 秒 
		"q+": Math.floor((dd.getMonth() + 3) / 3), // 季度 
		"S": dd.getMilliseconds() // 毫秒 
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
// 获取引入的假数据
getOneModuleData = function(options) {
	var dirname = options.dirname,
		currentPath = options.currentPath,
		req = options.req,
		res = options.res,
		groupName = options.groupName,
		branchName = options.branchName;
	var data = {};
	var ext =  path.extname(currentPath).replace('.', "");
	// js假数据
	if (ext === 'js') {
		return new Promise(function(resolve) {
			var fullPath = path.resolve(dirname, currentPath);
			try{
				// 如果当前模块存在就删除当前模块的缓存
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
				resolve(data);
			} catch(err) {
				// 假数据错误只提示
				resolve(data);
				log.error(err.message);
				err.message = "假数据解析出错：    " + err.message;
				consoleErrors.push(err);
			}
		});
	}
	// 如果是url过滤掉参数
	ext = ext.split('?')[0];
	// 远程假数据
	if (ext === 'html' || ext === 'do' || ext === 'htm' || ext === "action" || ext === "") {
		return parseRemote
		.getFtlData({
			url: currentPath,
			groupName: groupName,
			branchName: branchName,
		}).
		// 成功或者失败都返回数据
		then(function(data) {
			return data;
		}, function() {
			return data;
		});
	} else {
		return Promise.resolve(data);
	}
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

/**
 *
 * @param {object} [opt] [路径合集]
 * {
 * 	 @param rootPath 解析ftl的根路径
 *   @param ftlPath ftl的相对路径
 *   @param tmpFilePaths 生成的临时ftl的所有路径 (主要是如果这个ftl报错了，需要把路径替换成 真正的flt)
 * }
 * @param data ftl需要的全局假数据
 * @param res request请求对象
 * @returns {*}
 */
parseFtl = function(opt, isMockAjax) {
	var cmd;
	var stdout;
	var stderr;
	var option = {};
	var rootPath = opt.rootPath,
		ftlPath = opt.ftlPath,
		tmpFilePaths = opt.tmpFilePaths,
		res = opt.res,
		data = opt.data;
	data = JSON.stringify(data, function(current, value) {
		if (typeof value === 'object') {
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
	option = {
		dir: rootPath,
		path: ftlPath,
		ftlFormat: opt.ftlFormat
	};
	option = JSON.stringify(option);
	cmd = spawn('java', ["-jar", jarFilePath, option, data]);
	stdout = cmd.stdout;
	stderr = cmd.stderr;
	return Promise.props({
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
			// 需要ajax mock假数据
			if (isMockAjax) {
				finalData = insertajaxMock(finalData);
			}
			res.send(finalData);
		} else {
			// 没有错误ftl输出为空
			if (!data.wrongData) {
				if (isMockAjax) {
					data.rightData = insertajaxMock(data.rightData);
				}
				res.send(data.rightData);
			} else {
				res.render("500", {
					message: ['<div>', data.wrongData.replace(/\n/g, "<br>"), '</div>'].join('') || "ftl解析错误"
				});
			}
		}
	});
};
// 插入ajax假数据
insertajaxMock = function(fileContent) {
	var head = "\<head\>";
	var script = fs.readFileSync(path.join(__dirname, "./parseRemote/setXmlHttpReq.js"), {
		encoding: "utf8"
	});
	return fileContent.replace(head, head + "\r\n<script>" + script + "</script>");	
};
// 将ftl错误解析后扔到console。log中去
getFtlConsoleErrorString = function(messages) {
	var result;
	result = messages.map(function(val, index) {
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
// 向控制台输出错误
getConsoleErrors = function() {
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
