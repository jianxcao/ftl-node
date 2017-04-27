# 命令调用

run.config.js下root节点添加 start表示命令调用，根据不同得系统可以调用不同得命令

命令会在ui界面中的项目配置面板下，点击start开启命令，点击  stop停止命令, 具体请看[ui界面配置](../ui.md)

## 命令配置
``` json
{
    start: 'ls -l'
}

```
