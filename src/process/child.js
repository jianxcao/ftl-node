var app = require('../index');
var tools = require('../tools');
var Promise = require('promise');
var log = require('../log');
var dgram = require('dgram');
var clientSocket = dgram.createSocket('udp4');
var lis = function (server) {
	return new Promise(function (resolve, reject) {
		var succ =  function () {
			server.removeListener('error', fail);
			server.removeListener('listening', succ);
			resolve();
		};
		var fail = function () {
			reject();
		};
		server.once('error', fail);
		server.once('listening', succ);
	});
};
app()
.then(function (result) {
	result = result || {};
	var proxy = result.proxy;
	var config = result.confg;
	// 用户输入的 配置
	var program = result.program;
	var connectMsgPort = +program.connectMsgPort;
	var send = function (status, callback) {
		callback = callback || tools.loop;
		if (!typeof msg === 'number') {
			return;
		}
		var result = {
			action: 'start',
			type: 'server',
			status: status
		};
		var msg = JSON.stringify(result);
		if (!connectMsgPort) {
			return;
		}
		clientSocket.send(msg, 0, msg.length, connectMsgPort, 'localhost', callback);
	};
	clientSocket.on('error', function(err){
		log.error('通讯进程出错');
		log.error(err);
		process.exit(1);
	});
	return new Promise(function (resolve, reject) {
		if (!program) {
			reject();
			return;
		}
		if (program.cert) {
			resolve();
			send(100);
		}
		var servers = proxy.servers;
		var uiServer = proxy.ui.uiServer;		
		// 三个server的监控必须成功，也可能是2个5
		if (uiServer && servers && servers.length) {
			var all = [lis(uiServer)];	
			servers.forEach(function (server) {
				all.push(lis(server));
			});
			return resolve(Promise.all(all).then(function () {
				send(100);
			}));
		}
		resolve();
	});
})
.then (null, function (err) {
	log.error(err);
	process.exit(1);
});
