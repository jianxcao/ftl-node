var program = require('commander');

program
	.version('1.4.0')
	.option('-p --port <port>', '定义端口', parseInt)
	.option('-r --run-cmd <command>', "自动运行run.config.js中的start命令", /^(true|false)$/i)
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
if (program.runCmd === "true") {
	program.runCmd = true;
} else if (program.runCmd === "false") {
	program.runCmd = false;
}
module.exports = program;
