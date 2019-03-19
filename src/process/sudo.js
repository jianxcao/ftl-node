"use strict";
var through2 = require('through2');
var spawn = require('child_process').spawn;
var inpathSync = require('inpath').sync;
var path = process.env['PATH'].split(':');
var sudoBin = inpathSync('sudo', path);
// 启动或者拿到消息服务器
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
	// 并将这个内置参数传递给子进程
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
		// 碰到需要密码，就干掉当前子进程，从新开启一个 sudo的进程
		var stderrStream = through2(function(chunk, enc, callback) {
			var err = '请用sudo管理员权限打开';
			var str = chunk.toString();
			// 进程需要sudo打开
			if (str.indexOf(err) > -1) {
				isPipe = true;
				connectMsgServer.removeListener('msg', msg);
				stderrStream.unpipe(process.stderr);
				stderr.unpipe(stderrStream);
				stderrStream = null;
				resolve(sudo(command, options, connectMsgServer, connectMsgPort));
				// 此处结束child进程
				child.kill();
			}
			callback(null, chunk);
		});
		
		// 用于进程通讯的 msgServer
		var msg = function (msg) {
			if (msg.type === 'server' && msg.status === 100 && (msg.action === 'start' || msg.action === 'cert')) {
				isPipe = true;
				stderrStream.pipe(process.stderr);
				stdout.pipe(process.stdout);
				resolve(child);
				if (msg.action === 'cert') {
					child.once('exit', function () {
						process.exit(0);
					});
				}
			}
		};		

		connectMsgServer.once('msg', msg);

		stderr.pipe(stderrStream);
	
		child.once('error', function (s) {
			if (!isPipe) {
				stderrStream.pipe(process.stderr);
				stdout.pipe(process.stdout);
				resolve(child);
			}
		});

		child.once('exit', function (s) {
			if (!isPipe) {
				isPipe = true;
				stderrStream.pipe(process.stderr);
				stdout.pipe(process.stdout);
				// 断开主进程写入数据
				process.stdin.unpipe(child.stdin);
				resolve(child);
				process.nextTick(function () {
					process.exit(s);
				});
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
	connectMsg()
	// 取到通讯用得服务
		.then(function (result) {
			var connectMsgServer = result.server;
			if (platform === 'win32') {
				var child = exec(command, options, result.port);
				process.stdin.pipe(child.stdin);
				child.stdout.pipe(process.stdout);
				child.stderr.pipe(process.stderr);
				child.once('exit', function (s) {
					process.exit(s);
				});
				return Promise.resolve(child);
			} else if (platform === 'linux' || platform === 'darwin') {
			
				return start(command, options, result.server, result.port);
			} else {
				console.error('不支持的操作系统');
				process.exit(1);
				return Promise.reject();
			}
		});
}

// 尝试用sudo权限启动
function sudo (command, options, connectMsgServer, connectMsgPort) {
	var replacePrompt = '#node-sudo-passwd#';
	var args = [ '-S', '-p', replacePrompt ];
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
		var isRead = false;
		str.forEach(function (cur) {
			if (cur === replacePrompt) {
				if (++prompts > 1) {
					cachedPassword = null;
				}
				if (cachedPassword) {
					stdin.write(cachedPassword + '\n');
				} else {
					isRead = true;
				}
			} else {
				result += cur + '\n';
			}
		});
		callback(null, result);
		if (isRead) {
			read({ prompt: 'password:', silent: true }, function (error, answer) {
				if (error) {
					if (error.message === 'canceled') {
						process.exit(0);
					} else {
						log.error(error);
						process.exit(1);
					}
				} else {
					fse.outputFileSync(passwordPath, answer);
					cachedPassword = answer;
					stdin.write(answer + '\n');
				}
			});
		}
	});

	connectMsgServer.once('msg', function (msg) {
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

	child.once('exit', function (s) {
		process.exit(s);
	});
	return child;
}

exports = module.exports = main;
