// index.js
var totalCashPrice = 0;
var totalPointsPrice = 0;
var btnCC = document.getElementById("btn-cc");
var btnRBC = document.getElementById("btn-rbc");
var btnPP = document.getElementById("btn-pp");
var txtCC = document.getElementById("txt-cc");
var txtRBC = document.getElementById("txt-rbc");
var divPP = document.getElementById("div-pp");
var divCC = document.getElementById("div-cc");
var divRBC = document.getElementById("div-rbc");
var txtPP = document.getElementById("txt-pp");
var btns = [ btnCC, btnRBC, btnPP ];
var txts = [ txtCC, txtRBC, txtPP ];
var divs = [ divCC, divRBC, divPP ];
var btnSelected = -1;
var pointsBalance = 0;
selectptype(btnSelected);
enableQuery();
enablePay();

function loadProducts(){
	showLoadingMessage();
	xhrGet('api/products', function(retjson) {
		stopLoadingMessage();
		if (retjson.RC===0) {
			var table = document.getElementById('tabProds');
			var row;
			row = document.createElement('tr');
			row.className = "tableRows";
			row.innerHTML = "<th>Select</th><th>Description</th><th>Cash Price</th><th>Points Price</th>";
			table.lastChild.appendChild(row);
			if (retjson.products) for(var i = 0; i < retjson.products.length; ++i) {
				var product = retjson.products[i];
				totalCashPrice += product.price;
				totalPointsPrice += product.points;
				row = document.createElement('tr');
				row.className = "tableRows";
				row.innerHTML = "<td><input id='cb-"+product.sku+"' type='checkbox' checked='checked' onchange='updateCart(\""+product.sku+"\");' /></td><td>"+product.name+"</td><td id='prc-"+product.sku+"' style='text-align:right'>$"+product.price.toFixed(2)+"</td><td id='pts-"+product.sku+"' style='text-align:right'>"+product.points+"</td>";
				table.lastChild.appendChild(row);
			}
			row = document.createElement('tr');
			row.className = "tableRows";
			row.innerHTML = "<th>&nbsp;</th><th>Total</th><th id='prc-Total' style='text-align:right'>$"+totalCashPrice.toFixed(2)+"</th><th id='pts-Total' style='text-align:right'>"+totalPointsPrice+"</th></tr>";
			table.lastChild.appendChild(row);
		}
		else {
			document.getElementById('errorDiv').innerHTML += "ERROR: "+retjson.RC+" "+retjson.msg+"<br />";
		}
	}, function(err) {
		console.error(err);
	});
}

function showLoadingMessage()
{
	document.getElementById('shoppingCart').innerHTML = "<img height=\"100\" width=\"100\" src=\"images/loading.gif\"></img>";
}
function stopLoadingMessage()
{
	document.getElementById('shoppingCart').innerHTML = "Shopping Cart";
}
//AF loadProducts();

function showSpinner(show,idSpinner,idButton)
{
	if (show) {
		document.getElementById(idSpinner).innerHTML = "<img height=\"50\" width=\"50\" src=\"images/loading.gif\"></img>";
		document.getElementById(idButton).style.display = "none";
	} else {
		document.getElementById(idSpinner).innerHTML = "";
		document.getElementById(idButton).style.display = "inline";
	}
}

function updateCart(sku) {
	var cb = document.getElementById("cb-"+sku).checked;
	var tdPrice = document.getElementById("prc-"+sku);
	var price = parseFloat(tdPrice.innerHTML.substr(1));
	var tdPoints = document.getElementById("pts-"+sku);
	var points = +tdPoints.innerHTML;
	if (cb) {
		totalCashPrice += price;
		totalPointsPrice += points;
	} else {
		totalCashPrice -= price;
		totalPointsPrice -= points;
	}
	document.getElementById("prc-Total").innerHTML = "$"+totalCashPrice.toFixed(2);
	document.getElementById("pts-Total").innerHTML = totalPointsPrice;
	queryPoints();
}

function selectptype(btn) {
	btnSelected = btn;
	for (var i=0; i<btns.length; i++) {
		btns[i].style.display = btn===i ? "none" : "inline";
		txts[i].style.display = btn===i ? "inline" : "none";
		divs[i].style.display = btn===i ? "block" : "none";
	}
	enablePay();
}

function enableQuery() {
	document.getElementById("btn-rbcq").style.display = "none";
	if (document.getElementById("acct-rbc").value === "") return;
	document.getElementById("btn-rbcq").style.display = "inline";
	enablePay();
}

function enablePay() {
	document.getElementById("btn-submit").style.display = "none";
	if (totalPointsPrice <= 0) return;
	if (btnSelected < 0 ) return;
	if (btnSelected === 1 && pointsBalance < totalPointsPrice) return;
	var account = document.getElementById(btnSelected===0 ? "acct-cc" : (btnSelected===1 ? "acct-rbc" : "acct-pp" )).value;
	if (account === "") return;
	if (btnSelected === 0 && document.getElementById("exp-cc").value === "") return;
	document.getElementById("btn-submit").style.display = "inline";
}

function queryPoints() {
	document.getElementById("msg-rbc").innerHTML = "";
	if (btnSelected!==1) return;
	var account = document.getElementById("acct-rbc").value;
	if (account==="") return;
	showSpinner(true,"querySpinner","btn-rbcq");
	xhrGet('api/queryPoints?account='+account, function(retjson) {
	    showSpinner(false,"querySpinner","btn-rbcq");
		if (retjson.RC===0) {
			pointsBalance = retjson.points;
			document.getElementById("msg-rbc").style.color = "green";
			document.getElementById("msg-rbc").innerHTML = retjson.msg;
			if (pointsBalance < totalPointsPrice) {
				document.getElementById("msg-rbc").style.color = "red";
				document.getElementById("msg-rbc").innerHTML += "<br />You do not have enough points for this purchase.";
			}
			enablePay();
		} else {
			document.getElementById("msg-rbc").style.color = "red";
			document.getElementById("msg-rbc").innerHTML = retjson.msg;
		}
	}, function(err) {
	    showSpinner(false,"querySpinner","btn-rbcq");
		document.getElementById("msg-rbc").style.color = "red";
		document.getElementById("msg-rbc").innerHTML = "ERROR: "+err;
	});
}

function pay() {
	if (btnSelected===1) queryPoints();
	var ptype = btnSelected===0 ? "Credit Card" : (btnSelected===1 ? "Rewards Points" : "PayPal");
	var account = document.getElementById(btnSelected===0 ? "acct-cc" : (btnSelected===1 ? "acct-rbc" : "acct-pp" )).value;
	var msg =  btnSelected===0 ? "msg-cc" : (btnSelected===1 ? "msg-rbc" : "msg-pp");
	var query = '?ptype='+ptype+'&account='+account+'&price='+totalCashPrice.toFixed(2)+'&points='+totalPointsPrice;
	showSpinner(true,"paySpinner","btn-submit");
	xhrGet('api/checkout'+query, function(retjson) {
		showSpinner(false,"paySpinner","btn-submit");
		if (retjson.RC===0) {
			pointsBalance = retjson.points;
			document.getElementById('infoDiv').innerHTML = retjson.msg+"<br />";
			document.getElementById('tabProds').style.display = 'none';
			document.getElementById('tabPay').style.display = 'none';
		} else {
			document.getElementById(msg).style.color = "red";
			document.getElementById(msg).innerHTML = "ERROR: "+retjson.msg;
		}
	}, function(err) {
		showSpinner(false,"paySpinner","btn-submit");
		document.getElementById(msg).style.color = "red";
		document.getElementById(msg).innerHTML = "ERROR: "+err;
	});
}