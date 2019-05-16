# 简单路由配置

通过run.config.js中root节点下的routes控制简单路由
**规则倒序执行，即从数组最后一个开始执行**
如 
``` javascript
{
    // 接受一个数组作为每一项表示一个配配置
    // 每个配置有test正则取匹配访问的url
    // 匹配成功执行redirect，redirec必须返回 url，redirect 可以使一个字符串，promise或者fun
    // 
    routes: [{
        test: /.*/,
        redirect: '$1'
    },{
        test: /aaa.*/,
        redirect: function () {
            return 'url';
        }
    },{
        test: /aaa.*/,
        redirect: new Promise(function (resolve) {
            resolve(url);
        })
    },{
        test: /aaa.*/,
        // 直接修改aaa返回的内容
        content: new Promise(function (resolve) {
            resolve({
                content: 'test111'
            });
        })
    },{
        test: /aaa.*/,
        // 直接修改aaa返回的的res的headers,这个规则可以和 其他规则共存
        content: new Promise(function (resolve) {
            resolve({
                headers: {
                    'test': 111
                }
            });
        })
    }]

}

```
