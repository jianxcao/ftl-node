# ftl版本的配置

由于不同得freemarker得jar包，会有很大的不同，所以添加一个功能是设置当前编译ftl文件所用得jar包版本

系统内置几个版本的jar包放代码在`lib/jar`下

不建议修改 `lib/jar`的jar包

# 修改jar包得方式
run.config.js  root下添加 jarVersion
如果添加版本号码只能添加系统内置的几个版本，有  2.3.18,2.3.23, 2.3.25
可以写jar包得绝对路径，实现自定义jar包
``` json
{
    jarVersion: 2.3.25
}
```
