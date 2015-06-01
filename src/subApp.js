var express = require('express'),
	app = express(),
	log = require('../src/log'),
	path = require('path'),
	bodyParser = require('body-parser'),
	config = require('../src/config');
var isEmptyObject = function(obj) {
	for (var name in obj) {
		return false;
	}
	return true;
};

app.engine('.ejs', require('ejs').__express);
app.set('views', path.join( __dirname, '../views'));
app.set('view engine', 'ejs');
// 内部使用静态文件加载
app.use("/static", express.static(path.join(__dirname, '../static')));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.all(["/sys/manager.html", "/sys/manager"], function(req, res, next) {
	res.render("manager", {});
});
app.all(["/sys/get_config_ajax.html", "/sys/get_config_ajax"], function(req, res, next) {
	// 从配置中获取配置
	res.json(config.get() || {});
});
app.post(["/sys/set_config_ajax.html", "/sys/set_config_ajax"], function(req, res, next) {
	var data, keys = ["port", "host", "autoResponder"], setData = {}, status = false;
	try{
		if (req.body && req.body.data) {
			data = req.body.data;
			data = JSON.parse(data);
			if (isEmptyObject(data)) {
				config.del();
				config.save();
				return;
			}
			for (var i = 0; i < keys.length; i++) {
				if (data[keys[i]]) {
					status = true;
					setData[keys[i]] = data[keys[i]];
				}
			}
			if (status) {
				config.set(setData);
				config.save();
				res.send("1");
				return;
			}
		}
	}catch(e) {
		log.error(e.message);
	}
	res.send("0");
});
// 内部加载静态文件找不到错误
app.use(function(req, res, next){
	res.status(404);
	res.render("404", {
		message: "内部没有找到路径, 文件路径" + req.originalUrl
	});
});

// 内部加载静态文件错误
app.use(function(err, req, res, next) {
	log.error('内部错误发生错误了  ', err.message);
	res.status(500);
	res.render("500", {
		message: '内部错误发生错误了  ' + err.message
	});
});


module.exports = app;