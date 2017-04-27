# 简单路由配置

通过run.config.js中root节点下地 routes控制简单路由

如 
``` javasrcipt
{
    // 接受一个数组作为每一项表示一个配配置
    // 每个配置有test正则取匹配访问的url
    // 匹配成功执行redirect，redirec必须返回 url，redirect 可以使一个字符串，promise或者fun
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
    }]

}

```
