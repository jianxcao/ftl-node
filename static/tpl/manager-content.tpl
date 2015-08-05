<div class="form-horizontal form-wrap" data-branch-name="<%=data.branchName%>" data-group-name="<%=data.groupName%>">
	<div class="form-group">
		<div class="btn-group pull-right branch-btn-wrap">
			<button type="button" class="btn btn-default create-path">新建路径</button>
		</div>
	</div>
	<div class="form-group">
		<label class="col-md-1 control-label">项目根路径</label>
		<div class="col-md-8">
			<input type="text" class="form-control" placeholder="请输入项目根路径" value="<%=data.basePath || ""%>" name="basePath">
		</div>
	</div>
	<div class="drag-wrap">
		<%if (data.val && data.val.length) {%>
			<%for(var i = 0; i < data.val.length; i++) {%>
				<div class="form-group form-drag <%if (data.val[i].disabled){%> disabled<%}%>">
					<label class="col-md-1 control-label">路径</label>
					<div class="col-md-4">
						<input type="text" class="form-control" placeholder="请输入项目路径" value="<%=data.val[i].codePath || ""%>" name="codePath">
					</div>
					<label class="col-md-1 control-label">虚拟路径</label>
					<div class="col-md-4">
						<input type="text" class="form-control" placeholder="请输入虚拟路径" value="<%=data.val[i].virtualPath || ""%>" name="virtualPath">
					</div>
					<div class="col-md-2">
						<span class="glyphicon glyphicon-move move-icon"></span>
						<span class="glyphicon glyphicon-trash del-icon"></span>
						<span class="glyphicon glyphicon-ban-circle dis-icon"></span>
					</div>
				</div>
			<%}%>
		<%}%>
	</div>
</div>
