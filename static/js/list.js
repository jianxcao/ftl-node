(function($) {
	var headerTitle = $('#headTitle');
	var headBody = $('#headBody');
	var listData = window.listData;
	var data = null;
	var tpl = ['<% if(data && data.length) {%>',
					'<% var url = \/.*\\/$\/.test(window.location.pathname) ? window.location.pathname : window.location.pathname + "/";  %>',
					'<% data.forEach(function(oneData) {%>',
						'<tr>',
							'<td><a href="<%=url%><%=oneData.name%>"><%if (oneData.isDirectory) {%><span class="glyphicon glyphicon-folder-close"></span>&nbsp;&nbsp;<%}%><strong><%=oneData.name%></strong></a></td>',
							'<td><a href="<%=url%><%=oneData.name%>"><%=oneData.size%></a></td>',
							'<td><a href="<%=url%><%=oneData.name%>"><%=oneData.mtime.getFullYear()%>年<%=oneData.mtime.getMonth() + 1%>月<%=oneData.mtime.getDate()%>日<%=oneData.mtime.getHours()%>时<%=oneData.mtime.getMinutes()%>分<%=oneData.mtime.getSeconds()%>秒</a></td>',
						'</tr>',
					'<%});%>',
				'<%}%>'].join('');
	// 转换数据
	var changeData = function(listData) {
		var data;
		if (listData && listData.length) {
			data = listData.slice();
			for(var i = 0; i < data.length; i++) {
				if (data[i].mtime) {
					data[i].mtime = new Date(data[i].mtime);
				}
			}
			return data;
		}
	};

	// 对数据排序
	var sort = function(type, desc) {
		if (type && data.length) {
			data.sort(function(a, b) {
				if (type == 'mtime') {
					if (desc) {
						return b[type] - a[type];
					} else {
						return a[type] - b[type];
					}
				} else if (type == "name") {
					if (desc) {
						return b[type] > a[type];
					} else {
						return b[type] < a[type];
					}
				} else if (type == "size") {
					if (desc) {
						return b[type] > a[type];
					} else {
						return b[type] < a[type];
					}
				}
			});
			var html = $.template(tpl, data);
			headBody.html(html);
		}
	};
	// 排序个功能
	headerTitle.delegate('th', 'click', function() {
		var type = this.getAttribute('data-sort'),
			desc = +(this.getAttribute('data-desc') || 0);
		if (!desc) {
			desc = 1;
		} else {
			desc = 0;
		}
		sort(type, desc);
		this.setAttribute('data-desc', desc);
	});
	data = changeData(listData);
})(jQuery);
