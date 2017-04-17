var log = require('./log');
var ip = require('ip');
var os = require('os');
var childProcess = require('child_process');
var portReg = /EADDRINUSE\s*[^0-9]*([0-9]+)/i;
var net = require('net');
var Promise = require('Promise');
var fs  = require('fs');
var path  = require('path');
exports.error = function(err){
	var port;
	if (err.message && err.message.indexOf("EACCES") > -1) {
		log.error("请用sudo管理员权限打开");
		process.exit(1);
	} else if (err.message.indexOf("EADDRINUSE") > -1) {
		port = err.port || (err.message.match(portReg) || ['', ''])[1];
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

exports.getPort = function(){
	return new Promise(function (resolve, reject) {
		var server = net.createServer();
		server.unref();
		server.on('error', reject);
		server.listen(0, function () {
			var port = server.address().port;
			server.close(function () {
				resolve(port);
			});
		});
	});
};

exports.loop = function () {};

exports.parseMsg = function (msg) {
	if (!msg) {
		return {};
	}
	msg = msg.toString();
	try {
		msg = JSON.parse(msg);
		if (!msg.type || !msg.action || !msg.status) {
			log.error('消息内容有问题');
			return {};
		} else {
			return msg;
		}	
	} catch(e) {
		log.error(e);
	}
	return {};
};

exports.tmpPath = (function () {
	// The expected result is:
	// OS X - '/Users/user/Library/Preferences'
	// Windows 8 - 'C:\Users\User\AppData\Roaming'
	// Windows XP - 'C:\Documents and Settings\User\Application Data'
	// Linux - '/var/local'
	var tmpPath = process.env.APPDATA;
	if (!tmpPath || tmpPath === 'undefined') {
		tmpPath = (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library/Preferences') : '/var/local');
	}
	var dirPath = path.resolve(tmpPath, 'ftl-node');
	var exits = fs.existsSync(dirPath);
	// 目录不存在
	if (!exits) {
		fs.mkdir(dirPath);
	}
	return dirPath;
})();
