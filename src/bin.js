#!/usr/bin/env node

// socket

var sudo = require('./process/sudo');
var tools = require('./tools');
var log = require('./log');
var promise = require('promise');
var connectMsg = require('./process/connectMsgServer');
var path = require('path');
connectMsg()
.then(function () {
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
process.on('uncaughtException', tools.error);

