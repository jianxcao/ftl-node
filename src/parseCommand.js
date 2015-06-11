var program = require('commander');

program
	.version('1.0.0')
	.option('-p, --port <port>', '定义端口', parseInt)
	.parse(process.argv);

module.exports = program;