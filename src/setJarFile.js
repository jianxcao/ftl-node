var path = require('path');
var basePath = path.join(__dirname, "../lib/jar");
var log = require('../src/log');
var fs = require('fs');
var fsExtra = require('fs-extra');
// 缓存的jar包版本
var cachePath= null;
//  获取当前的jarfile的路径
var parseJarPath = function() {
	var result = {};
	try{
		var testFile = /^freemarker\d+\.\d+\.\d+\.jar/;
		var filterFile = /[^\d\.]/g;
		var defaultVersion = "2.3.18";
		// 读取basePath下所有的文件的文件名称
		var fileInfos = fs.readdirSync(basePath);
		// 过滤文件，只要freemarker的jar包的文件，不要不带版本号码的
		fileInfos = fileInfos.filter(function(current) {
			return testFile.test(current);
		});
		var paths = [];
		var versions = fileInfos.map(function(currrent) {
			paths.push(path.join(basePath, currrent));
			currrent = currrent.replace(filterFile, "");
			return currrent.slice(0, currrent.length - 1);
		});
		result = {
			versions: versions,
			paths: paths,
			defaultVersion: defaultVersion
		};
	} catch(err) {
		log.error(err);
	}
	return result;
};

/*
 * 真正调用的是freemarker.jar这个文件，所以无论是用户配置的路径还是默认的jar文件，都是走这个路径的
 * 路径，用户设置的路径
 */
var setJarFile = function(version, rootPath) {
	var result = parseJarPath();
	if (!result || !result.versions) {
		throw new Error(" 读取jar默认路径出错");
	}
	var jarPath = "";
	var versions = result.versions;
	var currentVersion = "";
	// 查找lib/jar下的jar包是否可以使用
	for(var i = 0; i < versions.length; i++) {
		if (versions[i] === version) {
			currentVersion = versions[i];
			break;
		}
	}
	// 上面的规则没有找到jar，尝试version用作路径，看是否存在jar包路径
	if (!currentVersion && version) {
		// 加入直接是一个文件路径
		var tmpPath = path.resolve(rootPath, version);
		if (fs.existsSync(tmpPath)) {
			jarPath = tmpPath;
			currentVersion = true;
		}
	}
	if (!version) {
		currentVersion = result.defaultVersion;
	}
	if (!jarPath && currentVersion) {
		jarPath = path.join(basePath, "freemarker" + currentVersion + ".jar");
	}
	if (fs.existsSync(jarPath)) {
		// 没有缓存，则拷贝覆盖 freemarker.jar 文件
		if (cachePath !== jarPath) {
			fsExtra.copySync(jarPath, path.join(basePath, "freemarker.jar"));
			log.info('成功设置jar包，jar包原始路径:' + jarPath);
		}
		cachePath =  jarPath;
		log.info(jarPath);
	} else {
		throw  new Error("查找jar文件出错，jar文件路径: " + jarPath);
	}
	return jarPath;
};
exports = module.exports = setJarFile;
