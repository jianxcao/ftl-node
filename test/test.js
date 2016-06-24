var Promise = require('bluebird');
var parsePath = require('../src/parsePath');

// var tasks = [];
// var execParse = parsePath.execParse;
// tasks.push(function() {
// 	return new Promise(function(resolve, reject) {
// 		setTimeout(function() {
// 			console.log(0);
// 			resolve();
// 		}, 500);
// 	});
// });
// tasks.push(function() {
// 	return new Promise(function(resolve, reject) {
// 		setTimeout(function() {
// 			console.log(1);
// 			resolve();
// 		}, 500);
// 	});
// });
// tasks.push(function() {
// 	return ;
// });
// tasks.push(function() {
// 	return new Promise(function(resolve, reject) {
// 		setTimeout(function() {
// 			console.log(3);
// 			resolve('cjx');
// 		}, 500);
// 	});
// });
// tasks.push(function() {
// 	return new Promise(function(resolve, reject) {
// 		setTimeout(function() {
// 			console.log(4);
// 			resolve();
// 		}, 500);
// 	});
// });
// execParse(tasks).then(function(res) {
// 	console.log('final', res);
// });
parsePath("http://127.0.0.1/mobile")
.then(function(res) {
	console.log("结果", res);
});
