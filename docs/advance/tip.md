## 重要提示
1. 环境依赖于nodejs,最低版本4.0.0
2. 环境依赖java的jdk或者jre
3. 配置文件将记录于系统缓存文件中，请确保运行时有对系统缓存目录修改的权限,并注意如果缓存目录清除，将会删除配置文件
4. mac下会记用户的sudo密码,记录在临时文件中

> 支持request调用的方法

```
${request.getRequestURI()}
${request.getRequestURL()}
${request.getCookies()}
${request.getHeaderNames()}
${request.getHeader(String headerName)}
${request.getQueryString()}
${request.getParameter()}
${request.getParameterMap()}
${request.getParameterNames(String parName)}
${request.getServerName()}
${request.getServerPort()}
${request.getProtocol()}
${request.getScheme()}

```
