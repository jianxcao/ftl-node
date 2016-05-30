
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
		throw new Error('请至少配置一个可以用的分组');
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
	var val = [];
	if (branch.val && branch.val.length && branch.val.slice) {
		val = branch.val.slice(0);
	}
	if (!val.length && !basePath) {
		return;
	}
	//判断当前用户是否已经添加了一个路径表示当前跟路径的路径,并且没有配置虚拟路径
	var status = val.some(function(current) {
		if (path.resolve(basePath, (current.codePath || '')) === basePath &&  !current.virtualPath) {
			return true;
		}
	});
	console.log(branch, groupName);
	//如果没有帮用户添加一个--添加到队列的前面
	if (!status) {
		val.unshift({
			codePath: './'
		});
	}
	for(var j = 0; j < val.length; j++) {
		// 获取项目单独的配置，这里可以配置路由重定向
		current = val[j];
		if (current.disabled) {
			continue;
		}
		url = redirectUrl(url, groupName, branch.branchName);
		changePathname = URL.parse(url).pathname;
		//如果codePath为空默认为当前子路径
		codePath = current.codePath || "";
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
		if (p) {
			exists = fs.existsSync(p);
			if (exists) {
				return {
					//ftl全路径
					fullPath: p,
					//用户设置的基础路径
					userBasePath: basePath,
					//当前ftl文件的基础路径
					basePath: codePath,
					//ftl相对路径
					path: changePathname,
					groupName: groupName,
					branchName: branch.branchName
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

