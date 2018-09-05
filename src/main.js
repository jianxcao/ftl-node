require('./mimeExt');
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
	cookieParser = require('cookie-parser'),
	session = require('express-session'),
	merge = require('merge'),
	tls = require('tls'),
	net = require('net'),
	Promise = require('promise'),
	url = require('url'),
	catProxy = require('catproxy'),
	defDeploy = require('./cfgProp'),
	parseRemote = require('./parseRemote/parseRemoteMock');
var app = express();
var defCfg = defDeploy.cfg;
var cfgKey = defDeploy.key;

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

// 错误流程
var setErr = function() {
	app.use(function(req, res){
		res.status(404);
		res.render("404", {
			message: "没有找到路径, 文件路径," + req.originalUrl
		});
	});

	app.use(function(err, req, res, next) {
		var message = "";
		var t = typeof err;
		if (t === 'string') {
			message = err;
		} else if(t === 'object') {
			message = (err.message || "") + (err.msg || "") + (err.stack || ""); 
		}
		log.error('发生错误了,', message);
		res.status(500);
		res.render("500", {
			message: "发生错误了," + message
		});
	});
};

// 通用流程
var comInit = function() {
	var cfg = config.get();
	app.disable('x-powered-by');
	app.locals.baseUrl = "";
	app.locals.cdnBaseUrl =  "/__serverdir";
	// 设置模版
	app.engine('.ejs', require('ejs').__express);
	app.set('views', path.join(__dirname , '../views'));
	app.set('view engine', 'ejs');
	app.use(app.locals.cdnBaseUrl, express.static(path.join(__dirname, '../static')));
	app.use(['/__serverdir/sys/proxyAjax.html'], function(req, res) {
		parseRemote.getAjaxData({
			req: req,
			res: res
		});
	});
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

// 创建代理服务器
var createAutoProxy = function() {
	var cfg = config.get();
	var ProxyServer = catProxy.Server;
	var isServerStatic = new RegExp("^" + app.locals.cdnBaseUrl);
	var proxy = new ProxyServer({
		port: cfg.port,
		httpsPort: cfg.httpsPort,
		type: cfg.type,
		uiPort: cfg.uiPort,
		log: cfg.log,
		autoOpen: false,
		breakHttps: cfg.breakHttps,
		excludeHttps: cfg.excludeHttps,
		sni: cfg.sni
	}, false);
	// 没有出错的情况下
	proxy
	.use(parsePageUrl())
	// 找到本地地址
	.use(function(req, res, next) {
		console.log('aaaaaaaa');
		// 这里的err指得时parsePath失败
		var isLocalIp = req.isLocalIp;
		var serverPort = +req.serverPort;
		var port = +req.port;
		// 不可以访问目录
		if (config.get('autoProxy') && ((req.pathObject.isDirectory && !isLocalIp) || (isLocalIp && port !== serverPort))) {
			next();
		} else {
			app(req, res);
		}
	})
	// 没找到本地地址
	.use(function(err, req, res, next) {
		// 这里的err指得时parsePath失败
		var	urlObject = url.parse(req.url),
			pathname = urlObject.pathname,	
			extname = path.extname(pathname);
		var isLocalIp = req.isLocalIp;
		var serverPort = +req.serverPort;
		var port = +req.port;
		// 本机静态资源
		if (isServerStatic.test(pathname) || !config.get('autoProxy')) {
			return app(req, res);
		}
		if ((!isLocalIp && extname !== '.ftl') || (isLocalIp && serverPort !== port)) {
			next();
		} else {
			next(err);
		}
	});
	return proxy.init()
	.then(function(){
		return proxy;
	});
};

// 初始化配置
var initConfig = function(cfg) {
	// 初始化
	config.init();
	var fileCfg = config.get();
	cfgKey.forEach(function(key) {
		if (cfg[key] ===  undefined || cfg[key] === null) {
			if (fileCfg[key] !== undefined && fileCfg[key] !== null) {
				cfg[key] = fileCfg[key];
			} else {
				cfg[key] = defCfg[key];
			}
		}
	});
	for(var key in cfg) {
		if (cfg[key] !== undefined && cfg[key]!== null) {
			config.set(key, cfg[key]);
		}
	}
	setLogLevel();
	// 保存配置
	config.save();
};

var message = function() {
	// 别的进程发送的消息
	process.on('message', function(message) {
		if (!message.result || !typeof message.result === 'object') {
			return;
		}
		log.debug('receive message');
		if (message.type) {
			switch(message.type) {
			case "ftl_config":
				var data = {};
				cfgKey.forEach(function(current) {
					if (message.result[current] !== undefined && message.result[current] !== null) {
						data[current] = message.result[current];
					}
				});
				config.set(data);
				// 每次服务变动都重新设置下log
				config.save(cfgKey);
				setLogLevel();
				break;
			default:
				log.error('收到未知的消息', message);
			}
		}
	});
};

var setLogLevel = function() {
	var logLevel = config.get('log');
	// 设置当前的log级别
	if (logLevel) {
		log.transports.console.level = logLevel;
	}
};

process.on('uncaughtException', tools.error);
module.exports = exports = function(cfg) {
	initConfig(cfg);
	comInit();
	setErr();
	return createAutoProxy()
	.then(function(proxy) {
		var port = +cfg.uiPort;
		// uiPort 为0的时候表示没有ui
		if (!port) {
			return;
		}
		var myUrl = "http://" + tools.localIps[0] + port;
		// 用catprox的ui服务器, 用catproxy的 wsserver
		proxy.ui.app.use(subApp(proxy.ui.wsServer));
		var url = "http://" + tools.localIps[0] + ":" + port + "/manager"; 
		if (config.get('autoOpen')) {
			proxy.ui.uiServer.once('listening', function () {
				tools.openUrl(url);
			});
		}
		log.info('ftl-node, ui界面地址: ' + url);	
		message();
		return {
			proxy: proxy,
			config: config
		};
	})
	.then(null, function(err) {
		log.error(err);
		return Promise.reject(err);
	});
};
