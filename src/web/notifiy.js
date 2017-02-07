var WebSocketServer = require('ws').Server;
var log = require('../log');
var clients = {};

var gid = 1;
var getGuid = function() {
	return gid++;
};
var send = function(message) {
	for(var key in clients) {
		if (clients[key].connected) {
			clients[key].emit("message", message);
		} else {
			delete clients[key];
		}
	}
};
var close = function() {
	for(var key in clients) {
		if (clients[key].disconnected) {
			delete clients[key];
		}
	}
};

exports = module.exports = function(wss) {
	wss.of('/ftl').on('connection', function(ws) {
		log.info('有服务器连接到socket');
		clients[getGuid()] = ws;
		ws.on('disconnect', function() {
			close();
			log.info('socket服务器关闭');
		});
	});
	return {
		send: send,
		close: close
	};
};
