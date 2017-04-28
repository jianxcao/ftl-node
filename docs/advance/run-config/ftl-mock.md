# ftl假数据说明

## ftl假数据实现原理

ftl假数据主要是通过获取到用户设置的json文件，将json文件下地跟属性都转换成java得数据类型，在注入到ftl环境中得根节点中

ftl假数据分为远程假数据和本地假数据2种

1. 本地假数据
    - 在写ftl文件中加入 `<#--mock "./mock1.ftl.js"-->`
    - mock1.ftl.js是一个标准的node模块，需要到处一个对象，对象的节点将注入到 ftl中
    - 如果存在多个假数据文件，有键值重名的将会被覆盖
2. 远程假数据(可以将假数据托管在第三方平台或者其他系统中)
    - 远程假数据在run.config.js中添加
    - 在run.config.js中root下配置 `isMockFtl`，值设置为`true`,只有是true才开启假数据功能
    - 在run.config.js中root下配置 `mockFtl`
        * mockFtl是一个数组，数组下面是规则，同样规则通过test正则匹配，匹配成功执行redirect方法，redirect要求返回假数据的url
```javascript
var config = {
	isMockFtl: true,
	mockFtl: [{
		test: /.*/,
		redirect:function(url, queryString) {
			var base = "http://idoc.ms.netease.com/mock/getMockData.html?userName=jxcao&dateConvert=true&requestUrl=";
			// var domain = "http://g.caipiao.163.com";
			var domain = "http://888.163.com";
			// console.log(base + domain + url);
			if (/^http/.test(url)) {
				return url + "?" + queryString;
			}
			return base + domain + url;
		}
	}]
};
module.exports = config;
```
