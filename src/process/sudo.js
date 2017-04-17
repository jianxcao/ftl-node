"use strict";
var through2 = require('through2');
var spawn = require('child_process').spawn;
var inpathSync = require('inpath').sync;
var path = process.env['PATH'].split(':');
var readline = require('readline');
var sudoBin = inpathSync('sudo', path);
var connectMsg = require('./connectMsgServer');
var tools = require('../tools');
var log = require('../log');
var read = require('read');
var path = require('path');
var fs = require('fs');
var fse = require('fs-extra');
// 缓存密码的文件
var passwordPath = path.join(tools.tmpPath, '.pwd');
var exits = fs.existsSync(passwordPath);
// 目录不存在
if (!exits) {
	fse.ensureFileSync(passwordPath);
}
var cachedPassword = fs.readFileSync(passwordPath).toString();
var lastAnswer;
// 先尝试用普通权限执行
function exec (command, options, connectMsgPort) {
	command.push('--connectMsgPort', connectMsgPort);
	return spawn(command[0], command.slice(1), options.spawnOptions);
};

function start (command, options, connectMsgServer, connectMsgPort) {
	return new Promise(function (resolve, reject) {
		var child = exec(command, options, connectMsgPort);
		// 在收到成功消息前截取所有的消息
		var isPipe = false;
		var stderr = child.stderr;
		var stdout = child.stdout;
		process.stdin.pipe(child.stdin);
		// 用于进程通讯的 msgServer
		var msg = function (msg) {
			var msg = tools.parseMsg(msg);
			if (msg.type === 'server' && msg.action === 'start' && msg.status === 100) {
				isPipe = true;
				stdCorrectStream.pipe(process.stderr);
				stderrStream.pipe(process.stdout);
				resolve(child);
			}
		};		
		// 碰到需要密码，就干掉当前子进程，从新开启一个 sudo的进程
		var stderrStream = through2(function(chunk, enc, callback) {
			var err = '请用sudo管理员权限打开';
			var str = chunk.toString();
			// 进程需要sudo打开
			if (str.indexOf(err) > -1) {
				isPipe = true;
				stdCorrectStream.unpipe(process.stderr);
				stderrStream.unpipe(process.stdout);
				stderr.unpipe(stderrStream);
				stdout.unpipe(stdCorrectStream);
				stderrStream = null;
				stdCorrectStream = null;
				connectMsgServer.removeListener('message', msg);
				resolve(sudo(command, options, connectMsgServer, connectMsgPort));
				// 此处结束child进程
				child.kill();
			}
			callback(null, chunk);
		});

		var stdCorrectStream = through2(function(chunk, enc, callback) {
			callback(null, chunk);
		});
		connectMsgServer.once('message', msg);

		stderr.pipe(stderrStream);
		stdout.pipe(stdCorrectStream);

		child.on('error', function (s) {
			if (!isPipe) {
				stdCorrectStream.pipe(process.stderr);
				stderrStream.pipe(process.stdout);
				resolve(child);
			}
		});

		child.on('exit', function (s) {
			if (!isPipe) {
				isPipe = true;
				stdCorrectStream.pipe(process.stderr);
				stderrStream.pipe(process.stdout);
				// 断开主进程写入数据
				process.stdin.unpipe(child.stdin);
				process.nextTick(function () {
					process.exit(s);
				});
				resolve(child);
			}
		});
	});
}

function main(command, options) {
	if (!command || !command.length) {
		return Promise.reject();
	}
	options = options || {};
	var platform = process.platform;
	if (platform === 'win32') {
		return Promise.resolve(exec(command, options));
	} else if (platform === 'linux' || platform === 'darwin') {
		connectMsg()
		// 取到通讯用得服务
		.then(function (result) {
			var connectMsgServer = result.server;
			return start(command, options, result.server, result.port);
		});
	} else {
		console.error('不支持的操作系统');
		process.exit(1);
		return Promise.reject();
	}
}

// 尝试用sudo权限启动
function sudo (command, options, connectMsgServer, connectMsgPort) {
	var prompt = '#node-sudo-passwd#';
	var args = [ '-S', '-p', prompt ];
	// 添加一个内置的参数用于传递 进程交流的端口
	command.push('--connectMsgPort', connectMsgPort);
	args.push.apply(args, command);
	var prompts = 0;
	var child = spawn(sudoBin, args);
	var stderr = child.stderr;
	var stdout = child.stdout;
	var stdin = child.stdin;
	var prompts = 0;
	var isPipe = false;
	var stderrStream = through2(function(chunk, enc, callback) {
		var str = chunk.toString();
		str = str.split('\n');
		var result = '';
		str.forEach(function (cur) {
			if (cur === prompt) {
				if (++prompts > 1) {
					cachedPassword = null;
				}
				if (cachedPassword) {
					stdin.write(cachedPassword + '\n');
				} else {
					read({ prompt: 'password:', silent: true }, function (error, answer) {
						fse.outputFileSync(passwordPath, answer);
						cachedPassword = answer;
						stdin.write(answer + '\n');
					});
				}
			} else {
				result += cur + '\n';
			}
		});
		callback(null, result);
	});
	connectMsgServer.once('message', function (msg) {
		var msg = tools.parseMsg(msg);
		if (msg.type === 'server' && msg.action === 'start' && msg.status === 100) {
			isPipe = true;
			stderr.unpipe(stderrStream).unpipe(process.stderr);
			stderr.pipe(process.stderr);
		}
	});
	stderr
	.pipe(stderrStream)
	.pipe(process.stderr);

	// 数据直接输出到主进程
	stdout.pipe(process.stdout);

	child.on('exit', function (s) {
		process.exit(s);
	});
	return child;
}

exports = module.exports = main;
