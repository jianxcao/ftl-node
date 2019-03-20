var getProjectConfig = require('../src/getProjectConfig');
var mock = require('@jianxcao/mock');
var multer = require('multer');
var config = require('../src/config');
var parseMock = mock.parse;
var cache = {};
/**
 *  该模块功能
 *  在run.config.js 配置mock属性，该属性应该是一个目录，目录中放的js配置mock规则，则会根据规则返回数据
 *  mock为配置对象 
 *   {
 * 		watch: true, 是否开启watch
 *      cwd: '', 当前的工作目录，默认为run.config.js所在的目录
 *   }
 *  */
exports = module.exports = function serverMock() {
	return function (req, res, next) {
		var host = config.get('host');
		for (var i = 0, l = host.length; i < l; i++) {
			if (!host[i].disabled) {
				var branches = host[i].branches || [];
				for (var j = 0, ll = branches.length; j < ll; j++) {
					var branch = branches[j];
					if (!branch.disabled) {
						var basePath = branch.basePath;
						var commandConfig = getProjectConfig.findPath(basePath);
						if (commandConfig) {
							var result = parseOneCommand(commandConfig, req);
							if (result) {
								var handler = result.handler;
								if (typeof handler === 'function') {
									return multer().any()(req, res, function () {
										const result =  handler(req, res);
										if (result.then) {
											result.then(function () {
												next();
											}, function (err) {
												next(err);
											});
										} else {
											next();
										}
									});
								}
								return res.json(handler);
							}
						}
					}
				}
			}
		}
		next();
	};
};


function parseOneCommand (commandConfig, req) {
	var mock = commandConfig.mock;
	var rootPath = commandConfig.rootPath;
	// 获取mock目录
	if (mock) {
		var parseObj;
		if (cache[rootPath]) {
			parseObj = cache[rootPath];
		} else {
			var errors = [];
			parseObj = parseMock(Object.assign({
				watch: true,
				cwd: rootPath,
				errors,
			  }, mock));
			if (errors && errors.length) {
				console.error(errors);
			}
		}
		// 找到解析对象
		if (parseObj) {
			const result = parseObj(req);
			if (result) {
				return result;
			}
		}
	}
}
