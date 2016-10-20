var program = require('commander');
var path  = require('path');
var	fs = require('fs');
var pkg = require('../package');
var log = require('./log');
var config = require('./config');
var catProxy = require('catproxy');
var prompt = require('prompt');
var colors = require('colors');
var main = require('./main');
var numReg = /^([0-9]){2,}$/;
var list = function(val){
	val = val.split(',');
	val = val.filter( function(current) {
		return numReg.test(current);
	});
	return val.length ? val : undefined;
};
program
	.version(pkg.version)
	.option('-v, --version', '版本号码')
	.option('-a --autoProxy [value]', "自动代理true|false", /^(true|false)$/i)
	.option('-t, --type [value]', 'http或者https服务器类型, 同时开启2种服务器用all表示', /^(http|https|all)$/i)
	.option('-p, --port [list]', '代理端口 默认  http: 80, https: 443, 多个端口用，分割第一个表示http，第二个表示https', list)
	.option('-c, --cert', '生成根证书')
	.option('-u --uiPort [port]', "界面ui端口默认8001, 0表示没有图形界面", parseInt)
	.option('--autoOpen [ui]', "自动打开图形界面", /^(true|false)$/)
	.option('-r --runCmd <command>', "自动运行run.config.js中的start命令", /^(true|false)$/i)
	.option('-l, --log [item]', 
		'设置日志级别error, warn, info, verbose, debug, silly', 
		/^(error|warn|info|verbose|debug|silly)$/i)
	.on('--help', function() {
		console.log('  说明:');
		console.log('');
		console.log('    run.config.js是项目的配置文件，需要放在(项目)的根路径下');
		console.log('    run.config.js 的内容举例');
		console.log('');
		console.log('    var config = {');
		console.log('    	start: \'npm run start\',');
		console.log('    	routes: [{');
		console.log('    		test: /(.*)\.\w{10}\.([^\.]+)$/,');
		console.log('    		redirect: \'$1.\'');
		console.log('    	}],');
		console.log('       jarVersion: \'3.1.2\'');
		console.log('    };');
		console.log('    module.exports = config;');
		console.log('');
		console.log('');
		console.log('');
		console.log('    上述就是run.config.js的内容，导出了一个配置模块');
		console.log('');
		console.log('    配置中start:');
		console.log('      即命令表示需要运行的命令，配置该命令后，');
		console.log('      在管理页面中的项目下将会有 启动和停止按钮，');
		console.log('      启动就会调用该命令，停止将会强制停止该命令');
		console.log('');
		console.log("    配置中的routes:");
		console.log('      即路由重定义');
		console.log('      该定义优先级最高，通过test后，');
		console.log('      地址将转换成为redirect所配置的地址');
		console.log('');
		console.log('    配置中的jarVersion:');
		console.log('      可动态配置freemarker.jar包的版本');
		console.log('      可以配置一个绝对的路径，或者版本号码');
		console.log('      当前系统内置2个jar包版本2.3.18和2.3.23');
		console.log('      如果填版本号码，只认这2个版本号码，其他情况一律认为是路径');
		console.log('      如果找不到jar包，系统会加载默认2.3.18的jar包');
		console.log('      注意！！！注意！！！注意!!!');
		console.log('      重要的事情说三遍，');
		console.log('      没事不要删除本程序lib/jar/目录下的jar包，');
		console.log('      但是可以自己增加新的jar包');
	})
	.parse(process.argv);

var getConfig = function() {
	// 处理成cfg的config
	var cfg = {};
	if (program.runCmd === "true" || program.runCmd === true) {
		cfg.runCmd = true;
	} else if (program.runCmd === "false") {
		cfg.runCmd = false;
	}
	if (typeof program.type === 'string') {
		cfg.type = program.type;
	}
	if (program.port && program.port.length) {
		cfg.port = program.port;
	}
	if (program.autoProxy === "true" || program.autoProxy === true) {
		cfg.autoProxy = true;
	} else if (program.autoProxy === "false") {
		cfg.autoProxy = false;
	}
	cfg.uiPort = program.uiPort;
	if (program.autoOpen === "true" || program.autoOpen === true) {
		cfg.autoOpen = true;
	} else if (program.autoOpen === "false") {
		cfg.autoOpen = false;
	}	
	if (typeof program.log === 'string') {
		cfg.logLevel = program.log;
	}
	return cfg;
};


var cert = catProxy.cert;
// 生成证书
if (program.cert) {
	if (cert.isRootCertExits()) {
		prompt.start({noHandleSIGINT: true});
		prompt.get({
			properties: {
				isOverride: {
					type: 'string',
					required: true,
					message: '请输入 y 或者 n',
					description: colors.green("已经存在跟证书，是否覆盖?"),
					conform: function(val) {
						return val === 'yes' || val === 'no' || val === 'n' || val === 'y';
					}
				}
			}
		}, function (err, result) {
			if (err) {
				process.exit(1);
			} else {
				if (result.isOverride === 'yes' || result.isOverride === 'y') {
					cert.setRootCert();
				}
				process.exit(0);
			}
		});
	} else {
		cert.setRootCert();
		process.exit(0);
	}
} else {
	var cfg = getConfig();
	if (cfg.port && cfg.port.length) {
		if (cfg.port[1]) {
			cfg.httpsPort =  cfg.port[1];
		}
		cfg.port = cfg.port[0];
	}
	main(cfg);
}
