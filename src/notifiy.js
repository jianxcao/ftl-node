var WebSocketServer = require('ws').Server;
var log = require('../src/log');
var clients = {};
module = module.exports = function(server) {
	var wss = new WebSocketServer({server: server});
	wss.on('connection', function(ws) {
		log.info('有服务器连接到socket');
		clients[getGuid()] = ws;
		//ws.on('message', function(data, flags) {
		//	log.debug(data, flags);
		//});
		ws.on('close', function() {
			close();
			log.debug(clients);
			log.info('socket服务器关闭');
		});
		ws.on('error', function(err) {
			log.error(err);
		});
	});
	return {
		send: send,
		close: close
	};
};

var gid = 1;
var getGuid = function() {
	return gid++;
};
var send = function(message) {
	for(var key in clients) {
		if (clients[key].readyState === clients[key].CONNECTING || clients[key].readyState === clients[key].OPEN) {
			clients[key].send(message);
		}
	}
};
var close = function() {
	for(var key in clients) {
		if (clients[key].readyState === clients[key].CLOSED || clients.CLOSING) {
			delete clients[key];
		}
	}
};
