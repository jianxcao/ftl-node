<%for (var i = 0; i < data.length; i++) {%>
<dl class="nav" data-fun="group">
	<dt><span class="glyphicon glyphicon-ban-circle dis-icon"></span><span class="glyphicon glyphicon-trash del-icon"></span><span class="glyphicon glyphicon-folder-open folder-icon"></span><%=data[i].groupName%></dt>
	<dd class="item">
		<dl class="nav">
			<%if (data[i].branches && data[i].branches.length) {%>
				<%for (var j = 0; j < data[i].branches.length; j++) {%>
					<dd data-fun="project"><%=data[i].branches[j].branchName%><span class="glyphicon glyphicon-ban-circle dis-icon"></span><span class="glyphicon glyphicon-trash del-icon"></span></dd>
				<%}%>
			<%}%>
		</dl>
	</dd>
</dl>
<%}%>