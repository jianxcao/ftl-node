<span <%if (data.type=="error" || data.type=="err") {%>class="err"<%} else {%>class="info"<%}%>><%=data.title || ""%><%=data.message || ""%></span>
