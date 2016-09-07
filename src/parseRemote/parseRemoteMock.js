// 解析远程假数据包括ftl和 ajax的
var log = require('../log');
var getProjectConfig = require('../getProjectConfig');
var request = require("request");
var Promise = require('bluebird');
var parsePath = require('../parsePath');
var getCmdUrl, parseRule, getAjaxData, getFtlData;
var URL = require('url');
getAjaxData = function(options) {
	var	req = options.req,
		res = options.res,
		query = req.query,
		mainPage = query.mainPage,
		ajaxUrl = query.url,
		visitDomain;
	parsePath(mainPage).then(function(pathObject) {
		var urlObject = URL.parse(ajaxUrl);
		var port = req.app.get("port") || 80;
		if (urlObject.host) {
			visitDomain = urlObject.protocol + "\/\/" + urlObject.hostname + urlObject.port === '80' ? "" : (":" + urlObject.port);
		} else {
			port = port === '80' ? "" : (":" + port)
			visitDomain = req.protocol + ":\/\/" + req.hostname + port;
		}
		var url = getCmdUrl({
			type: "ajax",
			groupName: pathObject.groupName,
			branchName: pathObject.branchName,
			url: urlObject.pathname,
			queryString: urlObject.query,
			visitDomain: visitDomain,
		});
		if (!url) {
			log.warn('假数据url获取错误url是:' + options.url);
			return res.send("");
		}
		urlObject = URL.parse(url);
		//修改header中得host
		req.headers.host = urlObject.host;
		//直接将数据传递过去
		request({
			method: req.method,
			url: url,
			headers: req.headers
		})
		.pipe(res);
	}, function() {
		res.send("");
	});
};
getFtlData = function(options) {
	return new Promise(function(resolve, reject) {
		var urls = options.url.split('?');
		var currentUrl = urls[0];
		var queryString = urls[1] || "";
		queryString = queryString.split('#')[0];
		var url = getCmdUrl({
			type: "ftl",
			groupName: options.groupName,
			branchName: options.branchName,
			url: currentUrl,
			queryString: queryString
		});
		if (!url) {
			log.warn('假数据url获取错误url是:' + options.url);
			reject();
		}
		request(url, function(error, response, body) {
			if (!error && +response.statusCode === 200) {
				var json;
				try {
					json = JSON.parse(body);
				} catch(e) {
					log.warn('解析假数据出现错误请求url:' + url);
					reject();
				}
				if (json) {
				 	resolve(json);
				}
			} else {
				reject(error);
				log.warn(error);
				log.warn('请求假数据出现错误请求url:' + url);
			}
		});
	});
};

/**
 * 根据run.config.js获取 解析假数据所需要的url,
 * 如果返回为undefined或者空就是说不需要解析远程假数据,或者用户返回的url有问题
 * @param  {[object]} options [{
 * 
 * 
 * }]
 * run.config.js下地  假数据的规则
 *{
 *		test: string|reg,
 *		redirect: reg|string|fun 
 *	}
 * @return string url
 */
getCmdUrl = function(options) {
	var type = options.type,
		groupName = options.groupName,
		branchName = options.branchName,
		url = options.url,
		visitDomain = options.visitDomain;
	var commandConfig = getProjectConfig(groupName, branchName);
	var checkUrl = /^http/;
	var is = commandConfig[{
		ftl: 'isMockFtl',
		ajax: "isMockAjax"
	}[type]];
	var mock = commandConfig[{
		ftl: 'mockFtl',
		ajax: "mockAjax"
	}[type]];
	//配置需要配置假数据
	if (is) {
		//取到mock假数据的规则假数据规则的结构
		if (mock && mock.length) {
			return parseRule(mock, url, visitDomain, options.queryString);
		} else {
			//如果配置的是绝对路径，直接返回
			if (checkUrl.test(url)) {
				return url + "?" + options.queryString;
			}
			log.warn('没有配置正确地' + type + "假数据规则");
		}
	}
};
//解析规则
parseRule = function(mock, url, visitDomain, queryString) {
	var tmp, type, reg, checkUrl = /^http/,
		nUrl;
	for (var i = 0; i < mock.length; i++) {
		tmp = mock[i];
		if (tmp && tmp.test && tmp.redirect) {
			type = typeof tmp.test;
			if (type === "string") {
				reg = new RegExp(tmp.test);
			} else if (tmp.test instanceof RegExp) {
				reg = tmp.test;
			}
			if (reg instanceof RegExp) {
				if (reg.test(url)) {
					if (typeof tmp.redirect === "string") {
						url = url.replace(reg, tmp.redirect);
						if (checkUrl.test(url)) {
							return url;
						}
					} else if (tmp.redirect instanceof Function) {
						nUrl = visitDomain ? tmp.redirect(url, visitDomain, queryString) : tmp.redirect(url, queryString);
						if (checkUrl.test(nUrl)) {
							return nUrl;
						}
					}
				}
			}
		}
	}
	return checkUrl.test(url) ? url : undefined;
};
exports.getAjaxData = getAjaxData;
exports.getFtlData = getFtlData;
