var express = require('express'),
	app = express(),
	log = require('../src/log'),
	path = require('path'),
	bodyParser = require('body-parser'),
	MyCommand = require('../src/execCommand'),
	getProjectConfig = require('../src/getProjectConfig'),
	Promise = require('bluebird'),
	commandObj = {},
	config = require('../src/config'),
	parseRemote = require('./parseRemote/parseRemoteMock');
var isEmptyObject = function(obj) {
	for (var name in obj) {
		return false;
	}
	return true;
};

app.engine('.ejs', require('ejs').__express);
app.set('views', path.join( __dirname, '../views'));
app.set('view engine', 'ejs');
// 内部使用静态文件加载
app.use("/static", express.static(path.join(__dirname, '../static')));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.all(["/sys/manager.html", "/sys/manager"], function(req, res, next) {
	res.render("manager", {});
});
app.all(["/sys/get_config_ajax.html", "/sys/get_config_ajax"], function(req, res, next) {
	// 从配置中获取配置
	res.json(config.get() || {});
});


app.post(['/sys/shell_control.html', '/sys/shell_control'], function(req, res, next) {
	/*stats解析 0表示系统错误
	*1开头表示 启动命令的结果
	* 1: 运行成功
	* 11: 运行命令出错
	* 12: 命令已经在运行中
	* 13: 没有配置文件
	* 14: 配置文件解析出错
	*2开头表示 结束命令的结果
	* 2停止命令运行成功
	* 21 停止命令出错
	* 22 表示当前么有这个命令
	**/
	var result = {status: 0, message: "系统忙请,稍后再试"};
	var data;
	var currentCommandObj;
	new Promise(function(resolve){
		try{
			if (req.body) {
				data = req.body;
				data.type = +data.type;
				var branchName = data.branchName;
				var groupName = data.groupName;
				var key;
				var commandConfig;
				if (typeof data.type === "number" && branchName && groupName) {
					branchName = branchName.trim();
					groupName = groupName.trim();
					key = groupName + "_" + branchName;
					//发送命令
					currentCommandObj = commandObj[key];
					if (data.type === 1) {
						// 没有命令就创建命令
						if (!currentCommandObj) {
							commandConfig = getProjectConfig(groupName, branchName);
							if (!commandConfig) {
								result.status = 13;
								result.message = "没有找到对应的配置文件，请确认" + groupName + "分组下" + branchName + "分支根目录下有run.config.js文件，并且配置了跟路径";
							} else {
								if (!commandConfig.start || !commandConfig.rootPath) {
									result.status = 14;
									result.message = "请在run.config.js配置文件中输出start配置命令";
								} else {
									//"node app.js -p 8080"
									currentCommandObj = new MyCommand(commandConfig.start, {
										cwd: path.normalize(commandConfig.rootPath)
									}, groupName, branchName);
									commandObj[key] = currentCommandObj;
								}
							}
						}
						if (currentCommandObj) {
							if (currentCommandObj.runing) {
								result.status = 12;
								result.message = "当前" + groupName + "分组下" + branchName + "分支下的命令已经在运行状态";
							} else {
								resolve(new Promise(function(r) {
									currentCommandObj.exec(function(status) {
										if (status) {
											result.message = "成功运行" + groupName + "分组下" + branchName + "分支下的命令";
											result.status = 1;
										} else {
											result.status = 11;
											result.message = "运行" + groupName + "分组下" +branchName+ "分支下的命令出错";
										}
										r(result);
									});
								}));
							}
						}
					//结束正在运行的命令
					} else {
						currentCommandObj = commandObj[key];
						if (currentCommandObj) {
							if (currentCommandObj.runing) {
								resolve(new Promise(function(r) {
									currentCommandObj.exit(function(status) {
										if (status) {
											result.message = "成功停止" + groupName + "分组下" +branchName+ "分支下的命令";
											result.status = 2;
										} else {
											result.status = 21;
											result.message = "停止" + groupName + "分组下" +branchName+ "分支下的命令出错";
										}
										r(result);
									});
								}));
							} else {
								result.status = 22;
								result.message = "当前" + groupName + "分组下" +branchName+ "分支下没有正在运行的命令";
							}
						} else {
							result.status = 22;
							result.message = "当前" + groupName + "分组下" +branchName+ "分支下没有正在运行的命令";
						}
					}
				} else {
					result.message = "参数错误";
				}
			}
		}catch(e) {
			log.error(e);
			result.message = e.message;
		}
		resolve(result);
	}).then(function(result) {
		res.json(result);
	});
});
app.all(['/sys/is_have_shell_control.html', '/sys/is_have_shell_control'], function(req, res, next) {
	var status = "0";
	try{
		if (req.body) {
			data = req.body;
			var branchName = data.branchName;
			var groupName = data.groupName;
			if (branchName && groupName) {
				branchName = branchName.trim();
				groupName = groupName.trim();
				commandConfig = getProjectConfig(groupName, branchName);
				if (commandConfig && commandConfig.start && commandConfig.rootPath) {
					status = "1";
				}
			}
		}
	}catch(e) {
		log.error(e);
	}
	res.send(status);
});

app.post(["/sys/set_config_ajax.html", "/sys/set_config_ajax"], function(req, res) {
	var data, keys = ["port", "host", "autoResponder", "runCmd"], setData = {}, status = false;
	try{
		if (req.body && req.body.data) {
			data = req.body.data;
			data = JSON.parse(data);
			if (isEmptyObject(data)) {
				config.del();
				config.save();
				return;
			}
			for (var i = 0; i < keys.length; i++) {
				if (data[keys[i]]) {
					status = true;
					setData[keys[i]] = data[keys[i]];
				}
			}
			if (status) {
				config.set(setData);
				config.save();
				res.send("1");
				return;
			}
		}
	}catch(e) {
		log.error(e);
	}
	res.send("0");
});

app.all(['/sys/proxyAjax.html'], function(req, res) {
	parseRemote.getAjaxData({
		req: req,
		res: res
	});
});

// 内部加载静态文件找不到错误
app.use(function(req, res, next){
	res.status(404);
	res.render("404", {
		message: "内部没有找到路径, 文件路径" + req.originalUrl
	});
});
// 内部加载静态文件错误
app.use(function(err, req, res, next) {
	log.error('内部错误发生错误了  ', err.message);
	res.status(500);
	res.render("500", {
		message: '内部错误发生错误了  ' + err.message
	});
});

module.exports = app;
