// 整个应用的调用入口
var express = require('express'),
	app = express(),
	http = require('http'),
	server = http.createServer(app),
	notifiy = require('./src/notifiy')(server);
	
//将通知类放到 app中
app.set('notifiy', notifiy); 
//将通知放到全局对象中
global.notifiy = notifiy;

var	bodyParser = require('body-parser'),
	serverStatic = require('./src/serverStatic'),
	serverDir = require('./src/serverDir'),
	serverFtl = require('./src/serverFtl'),
	log = require('./src/log'),
	subApp = require('./src/subApp'),
	cookieParser = require('cookie-parser'),
	config = require('./src/config'),
	merge = require('utils-merge'),
	session = require('express-session');

// 500错误
var err500 = function(err, req, res, next) {
	log.error('发生错误了,', err.message);
	res.status(500);
	res.render("500", {
		message: "发生错误了," + err.message + "<br>" + err.stack || ""
	});
};
// 404错误
var err404 = function(req, res, next) {
	res.status(404);
	res.render("404", {
		message: "没有找到路径, 文件路径," + req.originalUrl
	});
};
/**
 * 入口方式 唯一参数 opt
 * @param  {object} options 配置对象
 * {
 *   port: 端口号码 默认 80
 *   runCmd: 命令是否默认执行 默认为true
 * }
 * @param {[callBack]} 回调函数，如果服务器开启后调用, callBack参数 url
 * @return {[type]}         [description]
 */

module.exports = function(options, callBack) {
	var opt = merge({}, options);
	// subApp即内部系统应用的path
	var innerPath = opt.innerPath || '/___mySystemInner';
	var port, runCmd;
	if (opt.port) {
		config.set('port', opt.port);
	}
	port = config.get("port") || 80;
	runCmd = config.get('runCmd');
	if (opt.runCmd === true) {
		runCmd = true;
	} else if (opt.runCmd === false){
		runCmd = false;
	}
	if (runCmd === undefined || runCmd === null) {
		runCmd = true;
	}
	config.set('runCmd', runCmd);
	// 内部路径
	innerPath = innerPath.replace(/^\/|\/$/, "");
	innerPath = "/" + innerPath;

	// 设置全局的 cdnurl
	app.locals.baseUrl = innerPath;
	subApp.locals.baseUrl = innerPath;
	// 自己用的静态资源目录
	app.locals.cdnBaseUrl =  innerPath + "/static";
	subApp.locals.cdnBaseUrl =  innerPath + "/static";
	// cookie设置
	app.use(cookieParser());
	// 设置session参数
	app.use(session({
		secret: 'ftl-node-test-c',
		resave: false,
		saveUninitialized: false
	}));

	// 解析参数
	app.use(bodyParser.urlencoded({ extended: false }));

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

	app.use(err500);

	app.use(err404);

	server.listen(port, function() {
		log.info('服务器成功启动', '端口号码', port);
		// 启动一个默认浏览器打开后台管理页面
		var url = "http://127.0.0.1" + (port == 80 ? "" : ":" + port);
		url += innerPath;
		url += "/sys/manager.html";
		log.info('服务器已经开启');
		if (typeof callBack === 'function') {
			callBack(url);
		}
	});
};
