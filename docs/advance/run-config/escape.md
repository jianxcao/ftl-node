# 设置转义

在freemarker中有一总开关，可以设置页面上的输出变量是否转义，这个值可以在run.config.js中配置

[freemaker文档](http://freemarker.org/docs/dgui_misc_autoescaping.html)

**该配置仅在freemarker版本大于2.3.24才有效**

如
``` javascript
{
    // true 为 转义，false为不转义
    ftlFormat: true
}

```
