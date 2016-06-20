# ftl-node 假数据调用说明

# 功能说明

1. ftl文件mock 可以调用远程请求或者本地文件。
2. 全面代理ajax，所有ajax可以通过代理，走远程假数据服务器。

# run.config.js 说明

```javascript
var config = {
	start: 'npm run start',
	jarVersion: '2.3.23',
	routes: [{
		test: /(.*)\.\w{10}\.([^\.]+)$/,
		redirect: '$1.$2'
	}],
	isMockFtl: true,
	mockFtl: [{
		test: /.*/,
		redirect:function(url) {
			var base = "http://idoc.ms.netease.com/mock/getMockData.html" +
                "?userName=jxcao&dateConvert=true&requestUrl=";
			var domain = "http://g.caipiao.163.com";
			return base + domain + url;
		}
	}],
	isMockAjax: true,
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
            "getMockData.htmluserName=jxcao&requestUrl=";
			console.log(base + domain + path);
			return base + domain + path;
		}
	}]
};
module.exports = config;
```



> run.config.js 放在项目的根目录下
>
> 负责对该项目进行配置
>
> run.config.js 是一个 node的模块，可以调用nodejs的方法
>
> 返回一个config对象，提供给给ftl-node 使用

### run.config.js 属性介绍

1. **start** 属性，表示在项目开始的时候调用的命令，即当项目切换到当前分支时，回去找到这个命令并调用，只要是系统的命令都可以
2. **jarVersion** 控制当前编译ftl的freemarker jar包得版本 内置 2.3.23, 2.3.18，如果想用其他版本，可以跟一个绝对路径 
3.  **routes** 表示路径的重定向, 当url命中到当前分组的时候，可以通过test属性测试，如果测试通过则可以通过redirect重新定义url，最后解析新返回的url， redirect可以是一个方法，如果是方法应该返回新的绝对地址的url
4. **isMockFtl** 是否 采用远程假数据
5. **isMockAjax** 是否接管所有的ajax，采用远程ajax假数据
6. **mockFtl** ftl假数据调用时使用
7. **mockAjax** ajax调用假数据时使用

# ftl 假数据使用说明

### 本地假数据说明

> ftl假数据调用通过  ```<#--<#mock "./mock.ftl.js">—>``` 去调用假数据
>
> 上方是一句注释代码，只有在ftl-node中认识，所以不会影响线上
>
> 假数据可以是一个js文件的路径，js文件是一个标准的node模块，要求返回一个json对象 
>
> 返回的js对象将会编译成一个 ftl的 对象

### 远程假数据说明

> 远程假数据通过<#--<#mock "./mock.html">—> 识别
>
> **这里 后缀如果是html则认为是一个远程假数据，后缀为js则认为是一个本地假数据**
>
> 远程假数据必须在 ```run.config.js```中配置isMockFtl属性为true，否则将无效
>
> mock标签中填写的url为相对url，填写了这个url必须在run.config.js中写mockFtl属性
>
> mockFtl是一个数组，每个对象表示一个规则对象
>
> 规则对象  test属性是用来匹配的，可以是一个正则表达式,匹配后将执行redirect属性或方法
>
> redirect 为方法的时候，参数是当前配置的url
>
> redirect执行后，要保证返回的是一个绝对的url，ftl-node 将会去请求该url，该url应该返回一个json数据
>
> 拿到json数据后，ftl-node 会把json数据转换成ftl数据，并注入ftl中，完成假数据的模拟

## ajax假数据说明

> ajax假数据必须在run.config.js中开启 isMockAjax为true
>
> 开启后所有的ajax请求将会被发送到 **/___mySystemInner/sys/proxyAjax.html**下
>
> 该请求有2个参数,url参数和 manPage参数
>
> url表示当前真正访问的url
>
> manPage表示 当前页面
>
> 同样在run.config.js中会有 mockAjax的配置
>
> mockAjax是一个数组，每个对象表示一个规则对象
>
> 规则对象  test属性是用来匹配的，可以是一个正则表达式,匹配后将执行redirect属性或方法
>
> redirect 为方法的时候，参数是当前配置的url,第二个参数是当前访问的域名
>
> redirect执行后，要保证返回的是一个绝对的url，ftl-node 将会去请求该url,
>
> 该url返回的结果将被当成ajax返回的结果
