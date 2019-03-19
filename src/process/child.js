var app = require('../index');
var tools = require('../tools');
var Promise = require('promise');
var log = require('../log');
var dgram = require('dgram');
var clientSocket = dgram.createSocket('udp4');
var merge = require('merge');
var lis = function (server) {
	return new Promise(function (resolve, reject) {
		var succ =  function () {
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
			callback = callback || tools.noop;
			var t = typeof status;
			var result = {
				action: 'start',
				type: 'server'
			};		
			if (t === 'object') {
				result = merge(result, status);
			}
			if (t === 'number') {
				result.status = status;
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
				send({
					status: 100,
					action: 'cert'
				});
				return resolve();
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
