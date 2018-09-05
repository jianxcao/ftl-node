var mime = require('mime');
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
				var content = pathObject.content;
				var headers = {
				};
				headers['cache-control'] = "no-store";
				// 时间点表示什么时候文件过期，缺点，服务器和客户端必须有严格的时间同步
				// 旧浏览器兼容  expires -1 表示不缓存
				headers.expires = "-1";			
				headers['Access-Control-Allow-Origin'] = "*";		
				if (content) {
					var mimeType = ext ? mime.getType(pathObject.path) : 'text/html';
					headers['content-type'] = mimeType;
					res.set(headers);
					return res.end(content);
				}
				// 渲染文件
				return res.sendFile(absPath, {
					headers: headers,
					maxAge: -1,
					lastModified: false
				});
			} catch(e) {
				next(e);
			}
		} else {
			next();
		}
	};
};
