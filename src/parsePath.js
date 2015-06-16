
// 转义html
// var escapeHtml = require('escape-html');
// object对象合并模块
// var merge = require('utils-merge');
// 解析url模块
var path = require('path');
var fs = require('fs');
var log = require('../src/log');
var config = require('../src/config');

/**
 * 根据配置文件和当前路径解析出一个合理的文件路径，解析成功则返回文件路径
 *
 * @param {String} pathname
 * @return{String} path，返回一个绝对的文件路径，如果文件找到的话
 */
var parsePath = function(pathname, callBack) {
	var pathTree = config.get();
	// 获取路径
	var pathname = path.normalize(pathname);
	var host = pathTree.host;
	var oneGroup, branchs, res;
	if (host && host.length) {
		for(var i = 0; i < host.length; i++) {
			oneGroup = host[i];
			// 如果禁用这个分组直接跳出
			if (oneGroup.disabled) {
				continue;
			}
			branchs = oneGroup.branches;
			if (branchs && branchs.length) {
				// 基础路径
				for (var k = 0; k < branchs.length; k++) {
					res = parseBranch(branchs[k], pathname, callBack);
					if (res) {
						return res;
					}
				}
			}
		}
	} else {
		throw new Error('host下至少配置一个可用的组');
	}
};
parseBranch = function(branch, changePathname, callBack) {
	var basePath;
	var	current,
		v, reg, p, codePath,
		exists;
	if (branch.disabled) {
		return;
	}
	basePath = path.normalize(branch.basePath || "");

	if (!(branch.val && branch.val.length)) {
		return;
	}
	for(var j = 0; j < branch.val.length; j++) {
		current = branch.val[j];
		if (current.disabled) {
			continue;
		}
		codePath = current.codePath;
		if (codePath) {
			// 将基础路径和 代码路径合并
			codePath = path.resolve(basePath, codePath);
			// 虚拟路径处理
			if (current.virtualPath) {
				v = path.normalize("/" + current.virtualPath);
				// 创建正则
				reg = new RegExp(["^", v].join('').replace(/\\/g, "\\\\"));
				// // 符合路经规则--去掉虚拟路径
				if (reg.test(changePathname)) {
					changePathname = changePathname.replace(reg, "");
					p = path.join(codePath, changePathname);
				}
			} else {
				p = path.join(codePath, changePathname);
			}
		}
		if (p) {
			p = p.replace(/\\\\/g, "\\");
			// 每个匹配的路径都去调用回调，这里仅仅是路径匹配了，不代表文件真正的存在
			var status = false;
			if (callBack && typeof callBack == 'function') {
				status = callBack(basePath, p, codePath, changePathname);
			}
			exists = fs.existsSync(p);
			// 如果callBack返回true，即callBack认为这个路径是合法的就返回这个路径，并停止递归
			if (exists || status) {
				return {
					fullPath: p,
					basePath: codePath,
					path: changePathname
				};
			}
		}
	}
}
module.exports = parsePath;
