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
var merge = require('merge');
var childProcess = require('child_process');
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

function runCmd (msg, server) {
	// 强制必须是buffer
	var opt = merge({}, msg.commandOpt, {
		encoding: 'buffer'
	});
	var child = childProcess.exec(msg.command, opt);
	var port = msg.port;
	var result = {
		type: 'server',
		action: 'exec',
		uid: msg.uid,
		pid: child.pid,
		status: 100
	};
	var send = function (current) {
		var res = merge({}, result, current);
		res = JSON.stringify(res);
		server.send(res, 0, res.length, port, 'localhost');
	};
	// 进程意外退出或者进程被杀掉，重置状态
	child.once("exit", function() {
		child.stdout.unpipe(process.stdout);
		child.stderr.unpipe(process.stderr);
		process.nextTick(function () {
			send({
				status: -101
			});
		});
	});
	//  把流给主进程
	child.stdout.pipe(process.stdout);
	child.stderr.pipe(process.stderr);
	child.stdout.on('data', function(chunk) {
		var str = chunk.toString('hex');
		send({
			status: 98,
			stream: str
		});
	});
	child.stderr.on('data', function(chunk) {
		var str = chunk.toString('hex');
		send({
			status: 99,
			stream: str
		});
	});
	send({});
};

/**
 * 发送msg 格式
 * 	{
 *		type: 'server',
 *		action: 'exec',
 *		uid: this.uid
 * 		//启动命令时候的命令
 * 		command: command,
 *     // 启动命令时候的opt
 *		commandOpt: commandOpt,
 *	};
 *
 * 回应msg格式
 * {
 *		type: 'server',
 *		action: 'exec',
 *		uid: this.uid,
 *		pid: 进程id,
 * 		status: 100 表示成功  -101 表示退出 99 错误输出流 98正确输出流
 * 		输出流
 * 		stream: null
 *	};
 * 
 */
function command (server) {
	server.on('msg', function (msg) {
		if (msg && msg.type == 'server' && msg.action === 'exec' && msg.uid && msg.command && msg.commandOpt) {
			runCmd(msg, server);
		}
	});
};
process.on('uncaughtException', tools.error);
