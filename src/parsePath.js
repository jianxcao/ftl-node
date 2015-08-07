
// 转义html
// var escapeHtml = require('escape-html');
// object对象合并模块
// var merge = require('utils-merge');
// 解析url模块
var path = require('path');
var fs = require('fs');
var log = require('../src/log');
var config = require('../src/config');
var querystring = require('querystring');
var getProjectConfig = require('../src/getProjectConfig');
var URL = require('url');
/**
 * 根据配置文件和当前路径解析出一个合理的文件路径，解析成功则返回文件路径
 *
 * @param {String} pathname
 * @return{String} path，返回一个绝对的文件路径，如果文件找到的话
 */
var parsePath = function(url) {
	url = querystring.unescape(url);
	var pathTree = config.get();
	// 获取路径
	var host = pathTree.host;
	var oneGroup, branches, res;
	if (host && host.length) {
		for(var i = 0; i < host.length; i++) {
			oneGroup = host[i];
			// 如果禁用这个分组直接跳出
			if (oneGroup.disabled) {
				continue;
			}
			branches = oneGroup.branches;
			if (branches && branches.length) {
				// 基础路径
				for (var k = 0; k < branches.length; k++) {
					res = parseBranch(branches[k], url, oneGroup.groupName);
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
var parseBranch = function(branch, url, groupName) {
	var basePath;
	var	current,
		tmp,
		v, reg, p, codePath,
		changePathname,
		exists;
	if (branch.disabled) {
		return;
	}
	basePath = branch.basePath || "";
	if (!(branch.val && branch.val.length)) {
		return;
	}
	for(var j = 0; j < branch.val.length; j++) {
		// 获取项目单独的配置，这里可以配置路由重定向
		current = branch.val[j];
		if (current.disabled) {
			continue;
		}
		url = redirectUrl(url, groupName, branch.branchName);
		changePathname = URL.parse(url).pathname;
		codePath = current.codePath;
		if (codePath) {
			// 将基础路径和 代码路径合并
			codePath = path.resolve(basePath, codePath);
			// 虚拟路径处理
			if (current.virtualPath) {
				v = path.normalize("/" + current.virtualPath);
				changePathname = path.normalize(changePathname);
				v = v.replace(/[\*\.\?\+\$\^\[\]\(\)\{\}\|\\\/]/g, function(cur) {
					return "\\" + cur;
				});
				tmp = ["^", v].join('');
				// 创建正则
				reg = new RegExp(tmp);
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
			exists = fs.existsSync(p);
			if (exists) {
				return {
					fullPath: p,
					basePath: codePath,
					path: changePathname
				};
			}
		}
	}
};

var redirectUrl = function(url, groupName, branchName) {
	var type, reg, tmp, nUrl, checkUrl = /^http.*/;
	var commandConfig = getProjectConfig(groupName, branchName);
	if (commandConfig && commandConfig.routes && commandConfig.routes.length) {
		for(var i = 0, l = commandConfig.routes.length; i < l; i++) {
			tmp = commandConfig.routes[i];
			if (tmp && tmp.test && tmp.redirect) {
				type = typeof tmp.test;
				if (type === "string") {
					reg = new RegExp(type);
				}
				if (tmp.test instanceof RegExp) {
					if (tmp.test.test(url)) {
						if (typeof tmp.redirect === "string") {
							url = url.replace(tmp.test, tmp.redirect);
						} else if (tmp.redirect instanceof Function) {
							nUrl = tmp.redirect(url) || "";
							if (nUrl.test(checkUrl)) {
								url = nUrl;
							}
						}
					}
				}
			}
		}
	}
	return url;
};

module.exports = parsePath;

