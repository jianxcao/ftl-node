var colors = require('colors');
module.exports = exports = function () {
	var v = process.version;
	var r = /v(\d+).+/i;
	if (!v) {
		console.error(colors.red('未知的node版本'));
		process.exit(1);
	}
	var s = v.match(r);
	if (s && s[1]) {
		v = +s[1];
		if (v < 4) {
			console.error(colors.red('node版本过低，请升级node版本'));
			return process.exit(1);
		} else {
			return true;
		}
	}
	console.error(colors.red('未知的node版本'));
	process.exit(1);	
};
