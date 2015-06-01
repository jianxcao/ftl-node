var express = require('express'),
	cookieParser = require('cookie-parser'),
	bodyParser = require('body-parser'),
	serverStatic = require('./src/serverStatic'),
	serverDir = require('./src/serverDir'),
	config = require('./src/config'),
	serverFtl = require('./src/serverFtl'),
	log = require('./src/log'),
	app = express(),
	subApp = require('./src/subApp'),
	url = require('url'),
	// subApp即内部系统应用的path
	innerPath = '/___mySystemInner',
	child_process = require('child_process');
innerPath = innerPath.replace(/^\/|\/$/, "");
innerPath = "/" + innerPath + "/"
// 初始化配置
var port;
// 设置全局的 cdnurl
app.locals.baseUrl = innerPath;
subApp.locals.baseUrl = innerPath;
app.locals.cdnBaseUrl =  innerPath + "static";
subApp.locals.cdnBaseUrl =  innerPath + "static";

// 解析参数
app.use(bodyParser.urlencoded({ extended: false }));
// 通过配置文件获取端口
port = config.get("port") || 80;

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

app.listen(port, function() {
	log.info('服务器成功启动');
	// 启动一个默认浏览器打开后台管理页面
	var cmd, uri = "http://127.0.0.1" + (port == 80 ? "" : ":" + port);
	uri += innerPath;
	uri += "sys/manager.html";	
	if (process.platform === 'win32') {
	  cmd = 'start';
	} else if (process.platform === 'linux') {
	  cmd = 'xdg-open';
	} else if (process.platform === 'darwin') {
	  cmd = 'open';
	}
	log.info('后台管理页面打开中');

	child_process.exec("start "+ uri);
});