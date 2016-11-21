var fontsFileExt = ["eot", "svg", "ttf", "woff"];
var excludeFileExt = ["ftl", "ejs", "jsp"];
exports = module.exports = function serveStatic() {
	return function serveStatic(req, res, next) {
		// 如果不是get请求或者 是head， 就直接到下一个请求
		if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== "POST") {
			return next();
		}
		var pathObject = req.pathObject;
		var ext = pathObject.ext;
		if (!~excludeFileExt.indexOf(ext)) {
			try{
				var absPath = pathObject.fullPath;
				var headers = {};
				// 字体文件
				if (~fontsFileExt.indexOf(ext)) {
					headers['Access-Control-Allow-Origin'] = "*";
				}
				// 渲染文件
				return res.sendFile(absPath, {
					headers: headers
				});
			} catch(e) {
				next(e);
			}
		} else {
			next();
		}
	};
};
