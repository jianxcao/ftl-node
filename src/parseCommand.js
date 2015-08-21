var program = require('commander');

program
	.version('1.3.1')
	.option('-p --port <port>', '定义端口', parseInt)
	.option('-r --run-cmd <command>', "自动运行run.config.js中的start命令", /^(true|false)$/i)
	.parse(process.argv);
if (program.runCmd === "true") {
	program.runCmd = true;
} else if (program.runCmd === "false") {
	program.runCmd = false;
}
module.exports = program;
