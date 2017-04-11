var log = require('./log');
var ip = require('ip');
var os = require('os');
var childProcess = require('child_process');
var portReg = /EADDRINUSE\s*[^0-9]*([0-9]+)/i;
exports.error = function(err){
	var port;
	if (err.message && err.message.indexOf("EACCES") > -1) {
		log.error("请用sudo管理员权限打开");
		process.exit(1);
	} else if (err.message.indexOf("EADDRINUSE") > -1) {
		port = err.message.match(portReg);
		port  = port && port.length > 1 ? port[1] : "";
		log.error('端口' + port + '被占用，请检查端口占用情况');
		process.exit(1);
	} else {
		log.error("出现错误：" + err.stack);
	}
};
var getIps = function() {
	var interfaces = os.networkInterfaces();
	var all = Object.keys(interfaces).map(function (nic) {
		var addresses = interfaces[nic].filter(function (details) {
			details.family = details.family.toLowerCase();
			if (details.family !== 'ipv4' || ip.isLoopback(details.address)) {
				return false;
			}
			return true;
		});
		return addresses.length ? addresses[0].address : undefined;
	}).filter(Boolean);
	return !all.length ? [] : all;
};

var localIps =  getIps();
localIps.push(ip.loopback('ipv4'));
exports.localIps = localIps;
exports.getIps = getIps;

// 打开界面
exports.openUrl = function(url) {
	if (!url) {
		return;
	}
	var cmd;
	if (process.platform === 'win32') {
		cmd = 'start';
	} else if (process.platform === 'linux') {
		cmd = 'xdg-open';
	} else if (process.platform === 'darwin') {
		cmd = 'open';
	}
	childProcess.exec([cmd, url].join(' '));
};
