/*
 * 极简模版引擎，基于大牛的引擎修改
 * http://ejohn.org/blog/javascript-micro-templating/
 * 详见：https://github.com/machao/tmpl/
 */
(function($) {
    var tmplCache = {},
        fnCache = {},
        guid = 0,
        toString = Object.prototype.toString,
        compile = function(tmpl, sp) {
            //默认分隔符
            var f = sp || "%",
                //动态创建函数，并增加数据源引用（data/my）
                fn = new Function("var p=[],my=this,data=my,print=function(){p.push.apply(p,arguments);};p.push('" +
                    // Convert the template into pure JavaScript
                    tmpl
                    .replace(/[\r\t\n]/g, " ")
                    .split("<" + f).join("\t")
                    .replace(new RegExp("((^|" + f + ">)[^\\t]*)'", "g"), "$1\r")
                    .replace(new RegExp("\\t=(.*?)" + f + ">", "g"), "',$1,'")
                    .split("\t").join("');")
                    .split(f + ">").join("p.push('")
                    .split("\r").join("\\'") + "');return p.join('');");
            return fn;
        };
    //对外接口
    $.template = function(tmpl, data, sp) {
        sp = sp || "%";
        var fn = toString.call(tmpl) === "[object Function]" ? tmpl : !/\W/.test(tmpl) ? fnCache[tmpl + sp] = fnCache[tmpl + sp] || compile(document.getElementById(tmpl).innerHTML, sp) : (function() {
            for (var id in tmplCache)
                if (tmplCache[id] === tmpl) return fnCache[id];
            return (tmplCache[++guid] = tmpl, fnCache[guid] = compile(tmpl, sp));
        })();
        return data ? fn.call(data) : fn;
    };
})(window.jQuery || window);