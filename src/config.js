var	fs = require('fs'),
	path = require('path'),
	log = require('../src/log'),
	merge = require('utils-merge'),
	dirPath,
	data = {},
	filePath;
// 初始化配置
var configInit = function() {
	// The expected result is:
	// OS X - '/Users/user/Library/Preferences'
	// Windows 8 - 'C:\Users\User\AppData\Roaming'
	// Windows XP - 'C:\Documents and Settings\User\Application Data'
	// Linux - '/var/local'
	// 获取系统临时目录
	var tmpPath = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + 'Library/Preference' : '/var/local');
	dirPath = path.resolve(tmpPath, "node-ftl");
	var exits = fs.existsSync(dirPath);
	// 目录不存在
	if (!exits) {
		fs.mkdir(dirPath);
	}
	// 临时文件存放位置
	filePath = path.resolve(dirPath, "tmp.json");
	// 判断是否存在临时文件
	exits = fs.existsSync(filePath);
	log.info("同步读取配置文件,如果不存在就跳过");
	if (exits) {
		var bufData = fs.readFileSync(filePath, "utf-8");
		try{
			data = JSON.parse(bufData);
		}catch(e) {
			data = {};
		}
	}
};


// 获取一个值
exports.get = function(key) {
	var tmp = data;
	if (!key) {
		return data;
	} else {
		key = key.split(':');
		for(var i = 0; i < key.length; i++) {
			if (tmp[key[i]]) {
				tmp = tmp[key[i]];
			} else  {
				return null;
			}
		}
		return tmp;
	}
}

// 设置一个直接
exports.set = function(key, val) {
	if (!key) {
		return false;
	}
	if (typeof key === "object") {
		data = merge(data, key);
		return true;
	}
	var tmp = data, keys;
	keys = key.split(':');
	key = keys[keys.length - 1];
	if (keys.length > 1) {
		for(var i = 0; i < keys.length - 1; i++) {
			if (typeof tmp == "object") {
				if (tmp[keys[i]]) {
					tmp = tmp[keys[i]];
				} else  {
					tmp = null;
					return false;
				}
			} else {
				return false;
				tmp = null;
			}
		}
	}
	if (tmp) {
		tmp[key] = val;
		return true;
	}
};
exports.del = function(key) {
	// 不传递key删除所有
	if (!key) {
		data = {};
	}
	// key 必须是字符串
	if (typeof key !== "string") {
		return;
	}
	var tmp = data, keys;
	keys = key.split(':');
	key = keys[keys.length - 1];
	if (keys.length > 1) {
		for(var i = 0; i < keys.length - 1; i++) {
			if (typeof tmp == "object") {
				if (tmp[keys[i]]) {
					tmp = tmp[keys[i]];
				} else  {
					tmp = null;
					return false;
				}
			} else {
				return false;
				tmp = null;
			}
		}
	}
	if (tmp) {
		delete tmp[key];
		return true;
	}
};
// 保存到文件
exports.save = function() {
	var myData = JSON.stringify(data);
	log.debug(filePath, "----save");
	try{
		var fd = fs.openSync(filePath, "w+");
		fs.writeSync(fd, myData, null, "utf-8");
		fs.closeSync(fd);
	}catch(e) {
		log.error(e);
	}
};
configInit();