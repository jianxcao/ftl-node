################# 使用node 编译 freemarker文件 ##############################
// 项目整个加载控制
{
	// 路由配置
	"routeConfig": "route.json",
	//服务器路径配置
	"serverConfig": "server.json",
	// ftl通用假数据配置文件
	"ftlDataConfig": "ftlData.json",
	// header中添加的其他参数
	"headerParam": {
	}
}







//配置服务器加载路径
{
	// 注意如果一个url被fitler拦截，将在不会走host
    "autoResponder": [{
        //url 可以是一个正则，匹配后拦截  
        url: "",
            // path是一个绝对路径的文件地址，如果写相对地址，则会以当前ftl编译执行的目录为根目录搜索文件
        path: ""
    }],
    // 所有项目路径配置
    "host": {
        // 基础路径，即所有项目的基础目录，也可以不配置
        "basePath": "D:/work",
        // 所有路径匹配原则，匹配则直接返回，所有有多个路径冲突的时候会返回最先配置的, 默认将放到 default分组中，也可也自己建立分组
        "path": [{
                "groupName": "default",
                "val": [{
                    "codePath": "20150228_xjren/apache",
                    "virtualPath": "caipiao"
                }, {
                    "codePath": "20150228_xjren/resin/ftl"
                }]
            }]
    }
};