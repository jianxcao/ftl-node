#!/usr/bin/env node

var commandConfig = require('./src/parseCommand');
var app = require('./index');
var child_process = require('child_process');
var log = require('./src/log');
// 读取配置，启动服务器
app({
	port: commandConfig.port,
	runCmd: commandConfig.runCmd
}, function(url) {
	var cmd;
	if (process.platform === 'win32') {
		cmd = 'start';
	} else if (process.platform === 'linux') {
		cmd = 'xdg-open';
	} else if (process.platform === 'darwin') {
		cmd = 'open';
	}
	log.info('后台管理页面打开中');
	child_process.exec([cmd, url].join(' '));
});
