<!-- data 是个数组表示所有的分组，分组下有分支 data有个属性 foldInfo 表示每个分组的折叠信息，这个是放在localstroage中的 -->
<%for (var i = 0; i < data.length; i++) {%>
<dl class="nav<%if (data[i].disabled){%> disabled<%}%>" data-fun="group" data-group-name="<%=data[i].groupName%>">
	<dt data-group-name="<%=data[i].groupName%>"><span class="glyphicon glyphicon-ban-circle dis-icon"></span><span class="glyphicon glyphicon-trash del-icon"></span><span class="glyphicon glyphicon-folder-<%if(data.foldInfo && data.foldInfo[data[i].groupName]){%>close<%}else{%>open<%}%> folder-icon"></span><%=data[i].groupName%></dt>
	<dd class="item <%if(data.foldInfo && data.foldInfo[data[i].groupName]){%>hidden<%}%>">
		<dl class="nav" data-group-name="<%=data[i].groupName%>"><%if (data[i].branches && data[i].branches.length) {%><%for (var j = 0; j < data[i].branches.length; j++) {%><dd data-fun="project" data-id="<%=j%>" data-branch-name="<%=data[i].branches[j].branchName%>" <%if (data[i].branches[j].disabled){%>class="disabled"<%}%> ><%=data[i].branches[j].branchName%><span class="glyphicon glyphicon-ban-circle dis-icon"></span><span class="glyphicon glyphicon-trash del-icon"></span></dd><%}%><%}%></dl>
	</dd>
</dl>
<%}%>



