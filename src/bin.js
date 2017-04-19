#!/usr/bin/env node

// socket
var checkNodeVersion = require('./checkNodeVersion');
checkNodeVersion();
var sudo = require('./process/sudo');
var tools = require('./tools');
var log = require('./log');
var promise = require('promise');
var connectMsg = require('./process/connectMsgServer');
var path = require('path');

connectMsg()
.then(function (result) {
	var server = result.server;
	server.on('message', function (msg) {
		msg = tools.parseMsg(msg);
		if (msg.type) {
			server.emit('msg', msg);
		}
	});
	command(server);
	// 启动子进程
	var child = function () {
		var options = {
			cachePassword: true,
			spawnOptions: {
				stdio: ['pipe', 'pipe', 'pipe']
			}
		};
		// 通过不同系统判断采用不同权限启动一个进程
		sudo(['node', path.join(__dirname, 'process/child.js')].concat(process.argv.slice(2)), options);
	};

	child();
	log.info('ftl-node主进程启动');

}, tools.error);

// 命令相关得请求
function command (server) {
	server.on('msg', function (msg) {
		// console.log('msg', msg);
	});
};
process.on('uncaughtException', tools.error);
