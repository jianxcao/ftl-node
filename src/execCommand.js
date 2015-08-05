var cp = require('child_process');
var spawn = cp.spawn;
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
	});
	// 把流给主进程
	cmd.stdout.pipe(process.stdout);
	cmd.stderr.pipe(process.stderr);
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
			log.info("成功停止命令:" + com.command);
			fun(true);
		}
	} else {
		cp.exec('taskkill /PID ' + pid + ' /T /F', {
			encoding: "GBK"
		}, function(err, stdout, stderr) {
			if (stderr && stderr.length) {
				fun(false);
				log.error(iconv.decode(stderr, 'GBK'));
			} else {
				log.info("成功停止命令:" + com.command);
				fun(true);
			}
		});
	}
};

module = module.exports = MyCommand = function(command, commandOpt) {
	this.command = command;
	this.commandOpt = commandOpt || {};
};

MyCommand.prototype.exec = execOrder;
MyCommand.prototype.exit = exit;

//myCommand = new MyCommand("npm run -s", {
//	cwd: "D:\\gitLab\\fe"
//});
//myCommand.exec();

//setTimeout(function() {
//	myCommand.exit();
//}, 5000);
