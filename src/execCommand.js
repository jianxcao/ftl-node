var log = require('../src/log');
var psTree = require('ps-tree');
var dgram = require('dgram');
var iconv = require('iconv-lite');
var tools = require('./tools');
var clientSocket = dgram.createSocket('udp4');
var Promise = require('promise');
var cp = require('child_process');
var cmd;
var isWin = /^win/.test(process.platform);

clientSocket.on('error', function(err){
	log.error('通讯进程出错');
	log.error(err);
	process.exit(1);
});

// 每次执行的唯id
var uid = (function () {
	var start = 1;
	return function () {
		return start ++;
	};
})();

var getPort = (function () {
	var port;
	var res = tools.getPort()
	.then(function (port) {
		return port;
	}, function (err) {
		log.error(err);
		process.exit(1);
	});
	return function() {
		if (!port) {
			return res;
		} else {
			return Promise.resolve(port);
		}		
	};
})();
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

/**
 * 发送一个命令
 * @param {*} command 
 * @param {*} commandOpt 
 * @param {*} callback 
 */
var send = function () {
	var com = this;
	getPort()
	.then(function (port) {
		var restult = {
			type: 'server',
			action: 'exec',
			command: com.command,
			commandOpt: com.commandOpt,
			uid: com.uid,
			port: port
		};
		var msg = JSON.stringify(restult);
		clientSocket.send(msg, 0, msg.length, com.connectMsgPort, 'localhost');
	});
};

// 执行一个命令
var execOrder = function(fun) {
	var com = this;
	if (this.runing) {
		return;
	}
	this.runing = true;
	fun = fun || tools.noop;
	log.info("准备运行命令:" + this.command);
	this.send(this.command, this.commandOpt);
	clientSocket.once('startSuccess', function () {
		fun(true);
	});
};

var exit = function(fun) {
	if (!this.runing || !this.pid) {
		return;
	}
	fun = fun || tools.noop;
	var pid = this.pid;
	var com = this;
	var signal = 'SIGKILL';
	log.info("准备停止命令:" + this.command);
	if (!isWin) {
		var isHaveErr = false;
		psTree(pid, function(err, children) {
			[pid].concat(
				children.map(function(p) {
					return p.PID;
				})
			).forEach(function(tpid) {
				try {
					process.kill(tpid, signal);
				} catch (ex) {
					log.error(ex);
					isHaveErr = true;
				}
			});
		});
		if (isHaveErr) {
			fun(false);
		} else {
			com.notifiy("info", "成功停止命令:" + com.command);
			log.info("成功停止命令:" + com.command);
			fun(true);
		}
	} else {
		cp.exec('taskkill /PID ' + pid + ' /T /F', {
			encoding: "GBK"
		}, function(err, stdout, stderr) {
			var errMessage;
			if (stderr && stderr.length) {
				fun(false);
				errMessage = iconv.decode(stderr, 'GBK');
				com.notifiy("err", errMessage);
				log.error(iconv.decode(stderr, 'GBK'));
			} else {
				log.info("成功停止命令:" + com.command);
				com.notifiy("info", "", iconv.decode(stdout, 'GBK'));
				com.notifiy("info", "成功停止命令:" + com.command);
				fun(true);
			}
		});
	}	
};

function MyCommand(opt) {
	var connectMsgPort = process.env.connectMsgPort;
	opt = opt || {};
	if (!opt.notifiyServer) {
		throw new Error('服务必须存在');
	}
	if (!connectMsgPort) {
		throw new Error('通讯进程出错');
	}
	var com = this;
	this.groupName = opt.groupName;
	this.branchName = opt.branchName;
	this.command = opt.command;
	this.commandOpt = opt.commandOpt || {};
	this.notifiyServer = opt.notifiyServer;
	this.connectMsgPort = connectMsgPort;
	this.send = send;
	this.uid = uid();
	getPort()
	.then(function (port) {
		clientSocket.bind(port);
	});
	clientSocket.on('message', function (msg) {
		var msg = tools.parseMsg(msg);
		if (msg && msg.type === 'server' && msg.action === 'exec' && msg.uid === com.uid && msg.pid) {
			// 服务器进程启动成功了
			if (msg.status === 100) {
				com.notifiy("info", "系统运行命令:" + com.command);
				com.pid = msg.pid;
				clientSocket.emit('startSuccess');
			} else if (msg.status === 99) {
				com.notifiy("err", "", new Buffer(msg.stream || "", 'hex').toString());
			} else if (msg.status === 98) {
				com.notifiy("info", "", new Buffer(msg.stream || "", 'hex').toString());
			} else if (msg.status === -101) {
				com.runing = false;
				// 进程退出
				com.notifiy("info", "系统停止了"+ com.command + "命令的运行");
				clientSocket.emit('closeSuccess');
			}
		}
	});
}
MyCommand.prototype.exec = execOrder;
MyCommand.prototype.exit = exit;

MyCommand.prototype.notifiy = function(type, title, message) {
	var groupName = this.groupName,
		branchName = this.branchName;
	var messgeObj = {};
	if (groupName && branchName) {
		messgeObj.groupName = groupName;
		messgeObj.branchName = branchName;
	}
	messgeObj.type = type;
	messgeObj.message = message;
	messgeObj.title = title;
	this.notifiyServer.send(JSON.stringify(messgeObj));
};
exports = module.exports = MyCommand;

// myCommand = new MyCommand("npm run -s", {
//	cwd: "D:\\gitLab\\fe"
// });
// myCommand.exec();

// setTimeout(function() {
//	myCommand.exit();
// }, 5000);
