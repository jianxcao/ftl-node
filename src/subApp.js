var express = require('express'),
	app = express(),
	log = require('../src/log'),
	path = require('path'),
	bodyParser = require('body-parser'),
	MyCommand = require('../src/execCommand'),
	getProjectConfig = require('../src/getProjectConfig'),
	commandObj = {};
	config = require('../src/config');
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
	var result = {status: 0};
	var data;
	var currentCommandObj;
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
							result.message = "没有找到对应的配置文件，请确认根目录下有run.config.js文件，并且配置了跟路径";
						} else {
							if (!commandConfig.start || !commandConfig.rootPath) {
								result.message = "请在run.config.js配置文件中输出start配置命令";
							} else {
								//"node app.js -p 8080"
								currentCommandObj = new MyCommand(commandConfig.start, {
									cwd: path.normalize(commandConfig.rootPath)
								});
								commandObj[key] = currentCommandObj;
							}
						}
					}
					if (currentCommandObj.runing) {
						result.message = "当前命令已经在运行状态";
					} else {
						currentCommandObj.exec(function(status) {
							if (status) {
								result.message = "成功运行当前命令";
								result.status = 1;
							} else {
								result.message = "运行命令出错";
							}
							res.json(result);
						});
					}
				//结束正在运行的命令
				} else {
					currentCommandObj = commandObj[key];
					if (currentCommandObj) {
						if (currentCommandObj.runing) {
							currentCommandObj.exit(function(status) {
								if (status) {
									result.message = "成功停止当前命令";
									result.status = 1;
								} else {
									result.message = "终止命令出错";
								}
								res.json(result);
							});
						} else {
							result.message = "当前没有正在运行的命令";
						}
					} else {
						result.message = "当前没有正在运行的命令";
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
	// 出错统一返回
	if (result.status === 0 && result.message) {
		res.json(result);
	}
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
	var data, keys = ["port", "host", "autoResponder"], setData = {}, status = false;
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
