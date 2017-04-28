# run.config.js配置

每个项目的根目录下可以有个run.config.js用于配置该项目


## run.config.js主要功能有

- [命令调用](run-config/cmd.md)
- [ftl假数据配置](run-config/ftl-mock.md)
- [ftl版本的配置](run-config/ftl-version.md)
- [简单路由转发配置](run-config/routes.md)
- [ajax假数据配置](run-config/ajax-mock.md)
- [设置是否转义ftl输出变量](run-config/escape.md)
## 完整配置文件

```javascript
var config = {
    // 要运行的命令(在节目配置中可以点按钮调用该命令)
	start: 'npm run start',
	// freemarker jar包得版本，这个版本号码程序中内置的版本号码，也可以是一个 绝对路径的jar包
	jarVersion: '2.3.23',
	routes: [{
		test: /(.*)\.\w{10}\.([^\.]+)$/,
		redirect: '$1.$2'
	}],
    // 是否开启 ftl假数据功能
	isMockFtl: true,
	//是否在ftl文件中转义输出变量，true转义，这个选项只有在freemarker版本大于等于 2.3.24时才生效
	ftlFormat: false,
    // ftl假数据注入规则函数
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
	}],
    // 是否开启 ajax假数据功能
	isMockAjax: true,
    // ajax 假数据注入规则
	mockAjax: [{
		test: /.*/,
		redirect: function(path, visitDomain, queryString) {
			var ip = /^http:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}.\d{1,3}/;
			var domain = visitDomain;
			//使用ip访问的
			if (ip.test(visitDomain)) {
				domain = "http://g.caipiao.163.com";
				// domain = "http://888.163.com";
			}
			console.log(queryString);
			var base =  "http://idoc.ms.netease.com/mock/" +
            "getMockData.html?userName=jxcao&requestUrl=";
			console.log(base + domain + path);
			return base + domain + path;
		}
	}]
};
module.exports = config;
```
