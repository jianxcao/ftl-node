#!/usr/bin/env node

var express = require('express'),
	app = express(),
	http = require('http'),
	server = http.createServer(app),
	notifiy = require('./src/notifiy')(server);

//将通知类放到 app中
app.set('notifiy', notifiy);

//将通知放到全局对象中
global.notifiy = notifiy;

var bodyParser = require('body-parser'),
	serverStatic = require('./src/serverStatic'),
	serverDir = require('./src/serverDir'),
	commandConfig = require('./src/parseCommand'),
	config = require('./src/config'),
	serverFtl = require('./src/serverFtl'),
	log = require('./src/log'),
	subApp = require('./src/subApp'),
	// subApp即内部系统应用的path
	innerPath = '/___mySystemInner',
	child_process = require('child_process');

var cookieParser = require('cookie-parser');
var session = require('express-session');

innerPath = innerPath.replace(/^\/|\/$/, "");
innerPath = "/" + innerPath;

// 初始化配置
var port, runCmd;
// 设置全局的 cdnurl
app.locals.baseUrl = innerPath;
subApp.locals.baseUrl = innerPath;
app.locals.cdnBaseUrl =  innerPath + "/static";
subApp.locals.cdnBaseUrl =  innerPath + "/static";

app.use(cookieParser());

app.use(session({
	secret: 'ftl-node-test-c',
	resave: false,
	saveUninitialized: false
}));

// 解析参数
app.use(bodyParser.urlencoded({ extended: false }));
if (commandConfig.port) {
	port = commandConfig.port;
	config.set('port', port);
} else {
	// 通过配置文件获取端口
	port = config.get("port") || 80;
}
runCmd = config.get('runCmd');
if (commandConfig.runCmd === true) {
	runCmd = true;
} else if (commandConfig.runCmd === false){
	runCmd = false;
}
if (runCmd === undefined || runCmd === null) {
	runCmd = true;
}
config.set('runCmd', runCmd);

// 保存配置
config.save();

app.disable('x-powered-by');
// 设置模版
app.engine('.ejs', require('ejs').__express);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// 引用子app，内部使用该app
app.use(innerPath, subApp);

// 运用静态文件路径---即生成一个路径表明当前文件路径
app.use(serverDir());
// 运用静态文件模块
app.use(serverStatic());
// // 运用ftl编译模块，即将ftl编译成html
app.use(serverFtl(port));
app.set("port", port);
app.use(function(err, req, res, next) {
	log.error('发生错误了,', err.message);
	res.status(500);
	res.render("500", {
		message: "发生错误了," + err.message
	});
});

app.use(function(req, res, next){
	res.status(404);
	res.render("404", {
		message: "没有找到路径, 文件路径," + req.originalUrl
	});
});

server.listen(port, function() {
	log.info('服务器成功启动', '端口号码', port);
	// 启动一个默认浏览器打开后台管理页面
	var cmd, uri = "http://127.0.0.1" + (port == 80 ? "" : ":" + port);
	uri += innerPath;
	uri += "/sys/manager.html";
	if (process.platform === 'win32') {
		cmd = 'start';
	} else if (process.platform === 'linux') {
		cmd = 'xdg-open';
	} else if (process.platform === 'darwin') {
		cmd = 'open';
	}
	log.info('后台管理页面打开中');

	child_process.exec([cmd, uri].join(' '));
});
