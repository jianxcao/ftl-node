
var dgram = require('dgram');
var serverSocket = dgram.createSocket('udp4');
var log = require('../log');
var tools = require('../tools');
var server, port;
/** 发送或者接受消息的类型
	{
		msg: '信息',
		type: '类型',
		action: '动作',
		status: '状态'
	}
*/
// 注意多个进程将会开启多个
var create = tools.getPort()
.then(function (p) {
	return new Promise(function (resolve, reject) {
		serverSocket.bind(p);
		serverSocket.on('listening', function () {
			log.info('通讯模块加载成功');
			resolve({
				server: serverSocket,
				port: p
			});
			server = serverSocket;
			port = p;
		});
	
		serverSocket.on('error', function (err) {
			log.error('通讯模块加载失败');
			reject(err);
			server = null;
			port = null;
			process.exit(1);
		});		
	});
});
module.exports = exports = function () {
	if (server) {
		return Promise.resolve({
			server: server,
			port: port
		});
	}
	return create;
};
