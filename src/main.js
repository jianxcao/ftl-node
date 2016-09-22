var tools = require('./tools'),
	express = require('express'),
	http = require('http'),
	https = require('https'),
	bodyParser = require('body-parser'),
	serverStatic = require('./serverStatic'),
	serverDir = require('./serverDir'),
	parseSet = require('./parseSet'),
	config = require('./config'),
	serverFtl = require('./serverFtl'),
	parsePageUrl = require('./parsePageUrl'),
	log = require('./log'),
	subApp = require('./web/subApp'),
	path = require('path'),
	childProcess = require('child_process'),
	cookieParser = require('cookie-parser'),
	session = require('express-session'),
	merge = require('merge'),
	tls = require('tls'),
	net = require('net'),
	getPort = require('empty-port'),
	Promise = require('bluebird'),
	url = require('url'),
	catProxy = require('catproxy');
var app = express();
var defCfg = {
	port: 80,
	httpsPort: 443,
	type: 'http',
	uiPort: 8001,
	autoproxy: false
};
var SNICallback = function(servername, callback) {
	try {
		var certObj = catProxy.cert.getCert(servername);
		var ctx = tls.createSecureContext({key: certObj.privateKey, cert: certObj.cert});
		callback(null, ctx);
	} catch (e) {
		log.error(e);
		callback(e);
	}
};

//错误流程
var setErr = function() {
	app.use(function(req, res){
		res.status(404);
		res.render("404", {
			message: "没有找到路径, 文件路径," + req.originalUrl
		});
	});

	app.use(function(err, req, res) {
		log.error('发生错误了,', err.message);
		res.status(500);
		res.render("500", {
			message: "发生错误了," + err.message
		});
	});
};

//通用流程
var comInit = function(cfg) {
	app.disable('x-powered-by');
	app.locals.baseUrl = "";
	app.locals.cdnBaseUrl =  "/__serverdir";
	// 设置模版
	app.engine('.ejs', require('ejs').__express);
	app.set('views', path.join(__dirname , '../views'));
	app.set('view engine', 'ejs');
	app.use(app.locals.cdnBaseUrl, express.static(path.join(__dirname, '../static')));
	if (!cfg.autoproxy) {
		app.use(parsePageUrl());
	}
	app.use(parseSet());
	app.use(cookieParser());
	app.use(session({
		secret: 'ftl-node-test-c',
		resave: false,
		saveUninitialized: false
	}));
	// 解析参数
	app.use(bodyParser.urlencoded({ extended: false }));
	// 运用静态文件路径---即生成一个路径表明当前文件路径
	app.use(serverDir());
	// 运用静态文件模块
	app.use(serverStatic());
	// 运用ftl编译模块，即将ftl编译成html
	app.use(serverFtl());
};

// 打开界面
var openUi = function(port) {
	port = + port;
	// 启动一个默认浏览器打开后台管理页面
	port  = port === 80 ? '' : (":" + port);
	var cmd, uri = "http://" + tools.localIps[0] + port + "/manager.html";
	log.info('ui界面地址: ' + uri);
	if (process.platform === 'win32') {
		cmd = 'start';
	} else if (process.platform === 'linux') {
		cmd = 'xdg-open';
	} else if (process.platform === 'darwin') {
		cmd = 'open';
	}
	log.info('后台管理页面打开中');
	childProcess.exec([cmd, uri].join(' '));
};

//创建ui界面
var createUi = function(cfg, autoProxyUrl) {
	var server = http.createServer();
	var my = subApp(server, autoProxyUrl);
	var port = +cfg.uiPort;
	if (port === 0) {
		return;
	}
	server.listen(port, function() {
		openUi(port);
	});
	server.on('error', function(err) {
		tools.error(err);
		process.exit(1);
	});
	return server;
};

//创建服务器
var createServer = function(cfg) {
	var servers = [];
	var type = cfg.type;
	var port = cfg.port, httpsPort = cfg.httpsPort;
	var certObj;
	if (type === 'all') {
		servers[0] = http.createServer();
		certObj = catProxy.cert.getCert('localhost');
		servers[1] = https.createServer({
			key: certObj.privateKey, cert: certObj.cert, rejectUnauthorized: false, SNICallback: SNICallback});
	} else if (type === 'https') {
		certObj = catProxy.cert.getCert('localhost');
		servers[0] = https.createServer({
			key: certObj.privateKey, cert: certObj.cert, rejectUnauthorized: false, SNICallback: SNICallback});
	} else if (type === 'http') {
		servers[0] = http.createServer();
	}
	servers.forEach(function(server, index) {
		var serverType = server instanceof  http.Server ? 'http' : 'https';
		var p = serverType === 'http' ? port : httpsPort;
		//启动出错，直接退出
		server.on('error', function(err) {
			tools.error(err);
			process.exit(1);
		});
		server.on('request', app);
		server.listen(p, function() {
			log.info('服务器成功启动', '端口号码', p);
		});
	});
	return servers;
};

var createAutoProxy = function(cfg) {
	var ProxyServer = catProxy.Server;
	var isServerStatic = new RegExp("^" + app.locals.cdnBaseUrl);
	return new Promise(function(resolve, reject) {
		if (+cfg.uiPort === 0) {
			resolve(cfg.uiPort);
		} else {
			getPort({
				startPort: 10001
			}, function(err, port) {
				if (err) {
					reject(err);
				} else {
					resolve(port);
				}
			});
		}		
	})
	.then(function(p) {
		var proxy = new ProxyServer({
			port: cfg.port,
			httpsPort: cfg.httpsPort,
			type: cfg.type,
			uiPort: p,
			log: cfg.logLevel
		}, null, false);
		proxy.use(parsePageUrl());
		//没有出错的情况下
		proxy.use(function(req, res) {
			app(req, res);	
		});
		proxy.use(function(err, req, res, next) {
			//这里的err指得时parsePath失败
			var	headers = req.headers,
				host = req.headers.host,
				hostname = host.split(':')[0],
				urlObject = url.parse(req.url),
				pathname = urlObject.pathname,	
				extname = path.extname(pathname);
			//本机静态资源
			if (isServerStatic.test(pathname)) {
				app(req, res);
			}
			//找不到文件
			if (err && extname !== 'ftl' && !net.isIP(hostname) && hostname !== 'localhost') {
				next();
			} else {
				if (err) {
					next(err);
				} else {
					//回去走老流程
					app(req, res);
				}
			}
		});
		proxy.init();
		return {
			proxy: proxy,
			uiPort: p
		};
	})
	.then(null, function(err) {
		log.error(err);
		process.exit(1);
	});
};

module.exports = exports = function() {
	//读取缓存配置文件
	var fileCfg = {};
	['port', 'httpsPort', 'type', 'uiPort', 'autoProxy', 'logLevel']
	.forEach(function(current) {
		var val = config.get(current);
		if ( val !== undefined && val !== null) {
			fileCfg[current] = val;
		}
	});
	var cfg = merge({}, defCfg, fileCfg);
	comInit(cfg);
	setErr();
	if (!cfg.autoProxy) {
		createServer(cfg);
		createUi(cfg);
	} else {
		createAutoProxy(cfg)
		.then(function(proxyObj) {
			var port = +proxyObj.uiPort !== 80  ? (":" + proxyObj.uiPort) : "";
			var myUrl = "http://" + tools.localIps[0] + port;
			createUi(cfg, myUrl);
		});
	}
	process.on('uncaughtException', tools.error);
};
