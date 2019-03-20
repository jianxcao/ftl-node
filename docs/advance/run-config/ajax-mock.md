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

## mock 目录实现假数据
1. 在run.config.js下设置 mock属性，mock属性可以监控一个cwd目录下的mock目录，mock目录中的所以js都会当成假数据

```javascript
{
    mock: {
        // 是否开启watch
        watch: true,
        cwd: __dirname
    }
}

```

### 假数据文件

``` javascript
module.exports = {
  // Support type as Object and Array
  'GET /api/users': {
    users: [1, 2],
  },

  // Method like GET or POST can be omitted
  '/api/users/1': {
    id: 1,
  },
  'GET /api/uses/45': {
    code: 0,
    data: [],
    msg: '323',
  },
  'GET /api/:id': async (req, res) => {
    res.body = {
      id: req.params.id,
    };
  },

  'POST /api/users': async (req, res) => {
    await sleep(3000);
    res.body = {
      id: 222,
    };
  },
  'POST /api/other': async (req, res) => {
    await sleep(3000);
    res.body = {
      id: 222,
    };
  },
};

function sleep () {
  return new Promise(function (res, rej) {
    setTimeout(function () {
      res();
    }, 3000);
  });
}


```
