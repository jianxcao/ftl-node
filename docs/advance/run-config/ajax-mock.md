# ajax假数据说明

## ajax假数据实现原理
ajax假数据主要是通过 拦截 xmlHttpRequest对象，获取到当前请求ajax的路径，然后修改成系统内置的路径，系统内置路径会请求 run.config.js中配置的规则，通过规则获取数据

* 在run.config.js的root下设置 `isMockAjax` 为true开启ajax请求
* 在run.config.js的root下设置 `mockAjax` 设置规则
    -  mockAjax是一个数组，数组下面是规则，同样规则通过test正则匹配，匹配成功执行redirect方法，redirect要求返回假数据的url
```javascript
    {
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
                "getMockData.html?userName=jxcao&requestUrl=";
                console.log(base + domain + path);
                return base + domain + path;
            }
        }]
    }
```
