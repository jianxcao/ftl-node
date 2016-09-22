var cp = require('child_process');
//var spawn = cp.spawn;
var exec = cp.exec;
var log = require('../src/log');
var psTree = require('ps-tree');
var cmd;
var iconv = require('iconv-lite');
var isWin = /^win/.test(process.platform);

var noop =  function() {};
//执行一个命令
var execOrder = function(fun) {
	var com = this;
	if (this.runing) {
		return;
	}
	fun = fun || noop;
	this.commandOpt.encoding = "GBK";
	log.info("准备运行命令:" + this.command);
	cmd = exec(this.command, this.commandOpt);
	// 进程意外退出或者进程被杀掉，重置状态
	cmd.once("exit", function() {
		cmd = null;
		com.runing = false;
		com.notifiy("info", "系统停止了"+ com.command + "命令的运行");
	});
	// 把流给主进程
	cmd.stdout.pipe(process.stdout);
	cmd.stderr.pipe(process.stderr);
	cmd.stdout.on('data', function(chunk) {
		com.notifiy("info", "", chunk.toString());
	});
	cmd.stderr.on('data', function(chunk) {
		com.notifiy("err", "", chunk.toString());
	});
	com.cmd = cmd;
	com.runing = true;
	fun(true);
};
var exit = function(fun) {
	if (!this.runing) {
		return;
	}
	fun = fun || noop;
	var pid = this.cmd.pid;
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
	this.groupName = opt.groupName;
	this.branchName = opt.branchName;
	this.command = opt.command;
	this.commandOpt = opt.commandOpt || {};
	this.notifiyServer = opt.notifiyServer;
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

//myCommand = new MyCommand("npm run -s", {
//	cwd: "D:\\gitLab\\fe"
//});
//myCommand.exec();

//setTimeout(function() {
//	myCommand.exit();
//}, 5000);
