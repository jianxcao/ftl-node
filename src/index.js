var program = require('commander');
var path  = require('path');
var	fs = require('fs');
var pkg = require('../package');
var log = require('./log');
var catProxy = require('catproxy');
var read = require('read');
var colors = require('colors');
var main = require('./main');
var merge  = require('merge');
var numReg = /^([0-9]){2,}$/;
var Promise = require('promise');
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
	.option('-a --autoProxy [value]', "自动代理true|false, 如果想当成代理服务器使用，该参数必须为true", /^(true|false)$/i)
	.option('-t --type [value]', 'http或者https服务器类型, 同时开启2种服务器用all表示', /^(http|https|all)$/i)
	.option('-p --port [list]', '代理端口 默认  http: 80, https: 443, 多个端口用，分割第一个表示http，第二个表示https', list)
	.option('-c --cert', '生成根证书')
	.option('-u --uiPort [port]', "界面ui端口默认8001, 0表示没有图形界面", parseInt)
	.option('--autoOpen [ui]', "自动打开图形界面", /^(true|false)$/)
	.option('-r --runCmd [value]', "自动运行run.config.js中的start命令", /^(true|false)$/i)
	.option('-b --breakHttps [value]', "是否破解https,破解https前请先安装证书， 可以是host，多个host以 , 分割, 关闭自动代理，该参数无效")
	.option('-e --excludeHttps [value]', "在设置拦截https的情况下，是否需要排除某些host，多个host请以，分割, 可以使用正则, '' 重置所有列表为默认， -e优先级高于 -b, 关闭自动代理，该参数无效")
	.option('-s --sni [value]', "sni 设置，该参数在将服务器当做代理使用时有效，  1表示采用nodejs的 snicallback方式（某些浏览器不支持，比如ie6，低版本androi, 默认）2 表示采用多台服务器去代理（全支持，但是性能低）, 关闭自动代理，该参数无效", /^(1|2)$/i)
	.option('-l --log [item]', 
		'设置日志级别error, warn, info, verbose, debug, silly', 
		/^(error|warn|info|verbose|debug|silly)$/i)
	// 这个端口每次随机，目前米有保存，只是为了在sudo启动进程的时候传递到子进程中
	.option('--connectMsgPort [value]', '多进程交流udpSocket端口')
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
	});
	
var getConfig = function() {
	// 处理成cfg的config
	var cfg = {};
	var booleanKeys = ['runCmd', 'autoOpen', 'autoProxy', 'breakHttps']; 
	['type', 'port', 'uiPort', 'log', 'breakHttps', 'excludeHttps', 'autoOpen', 'sni', 'runCmd', 'autoProxy']
	.forEach(function(current) {
		if (program[current] === 'true') {
			program[current] = true;
		}
		if (program[current] === 'false') {
			program[current] = false;
		}
		var type = typeof program[current];
		if (type === 'boolean') {
			if (~booleanKeys.indexOf(current)) {
				cfg[current] = program[current];
			}
		} else if (type === 'string') {
			program[current] = program[current].toLowerCase();
			if (program[current] === '') {
				if (current === 'excludeHttps') {
					cfg[current] = '';
				}
			} else {
				if (current == 'breakHttps' || current === 'excludeHttps') {
					cfg[current] = program[current].split(',');
				} else {
					cfg[current] = program[current];
				}
			}
		} else if (type === 'number') {
			if (program[current] >= -1) {
				cfg[current] = program[current];
			}
		} else if (type === 'object') {
			if (current === 'port' &&  program.port.length) {
				cfg.port = program.port;
			}
		}
	});
	return cfg;
};
module.exports = function app() {
	program.parse(process.argv);
	var result = {
		program: program
	};
	var cert = catProxy.cert;
	var connectMsgPort = +program.connectMsgPort;
	if (connectMsgPort) {
		process.env.connectMsgPort = connectMsgPort;
	}
	// 生成证书
	if (program.cert) {
		if (cert.isRootCertExits()) {
			promptCert(colors.green('已经存在根证书，是否覆盖?'), function () {
				cert.setRootCert();
			});
		} else {
			cert.setRootCert();
			process.exit(0);
		}
		return Promise.resolve(result);
	} else {
		var cfg = getConfig();
		if (cfg.port && cfg.port.length) {
			if (cfg.port[1]) {
				cfg.httpsPort =  cfg.port[1];
			}
			cfg.port = cfg.port[0];
		}
		return Promise.resolve(main(cfg))
		.then(function (res) {
			return merge(result, res);
		});
	}
};

function promptCert (prompt, callback) {
	if (!callback) {
		return;
	}
	
	read({ prompt: prompt}, function (error, answer) {
		if (error) {
			log.error(error);
			return process.exit(1);
		}		
		if (answer === '是' || answer === 'yes' || answer === 'y') {
			callback();
			process.exit(0);
		} else if (answer === '否' || answer === 'n' || answer === 'n') {
			process.exit(0);
		} else {
			promptCert(colors.green('请输入y或者n?'), callback);
		}
	});	
};
