/* 通过 groupName branchName 和项目跟路径获取项目下的一个配置文件 run.config.js
 * 配置文件格式如下
 * 如果成功获取该文件，则在 页面中会有启动和停止按钮，点击启动将会调用start命令，点击停止会杀掉start启动的进程
 * routes是一个配置，去拦截url配置改变url,在程序运行最前会去替换掉url
 {
	start: 'npm install -s && node ./node_modules/.bin/bower install -s && node ./node_modules/.bin/miaow . build',
	routes: [{
		test: /(.*)\.\w[10]\.js/,
		redirect: '$1.js'
	}]
 };
*/
var fs = require('fs');
var config = require('../src/config');
var path = require('path');
var log = require('../src/log');
var RcFinder = require('rcfinder');
module.exports = find = function(groupName, branchName) {
	var rootPath = getRootPath(groupName, branchName);
	var config, fullPath, rcFinder;
	// 成功获取了跟路径
	if (rootPath) {
		rootPath = path.normalize(rootPath);
		fullPath = path.join(rootPath, "run.config.js");
		rcFinder = new RcFinder('run.config.js', {
			loader: function(p) {
				try{
					if (require.cache && require.cache[p]) {
						delete  require.cache[p];
					}
					// 以模块形式引入这个文件
					config = require(p);
					if (config) {
						config.rootPath =  path.dirname(p);
						config.fullPath = p;
					}
					return config;
				} catch(err) {
					log.error(err);
				}
			}
		});
		return rcFinder.find(rootPath);
	}
};

// 获取项目的根路径
var getRootPath = function(groupName, branchName) {
	if (groupName && branchName) {
		var tmp = findBranch(groupName, branchName);
		if (tmp && tmp.branch && tmp.branch.basePath) {
			return tmp.branch.basePath;
		}
	}
};
// 找到一个分组
var findGroup = function(groupName) {
	var retVal = null;
	var host = config.get("host");
	if (host && host.length && groupName) {
		for (var i = 0, l = host.length; i < l; i++) {
			var group = host[i];
			if (group.groupName && group.groupName === groupName) {
				retVal = {
					group: group,
					index: i
				};
				break;
			}
		}
	}
	return retVal;
};
// 找到一个分支
var findBranch = function(groupName, branchName) {
	var retVal = null,
		tmp, group;
	if (groupName && branchName) {
		tmp = findGroup(groupName);
		if (tmp) {
			group = tmp.group;
			if (group && group.branches && group.branches.length) {
				for (var i = 0, l = group.branches.length; i < l; i ++) {
					var branch = group.branches[i];
					if (branch.branchName && branch.branchName === branchName) {
						retVal = {
							group: group,
							branch: branch,
							index: i
						};
						break;
					}
				}
			}
		}
	}
	return retVal;
};
