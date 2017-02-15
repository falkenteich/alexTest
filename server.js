var express = require('express')
  , routes = require('./routes/index')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , url = require('url');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

console.log("AF: Set up to talk to API Management");
var apimUrl = url.parse("https://api.apim.ibmcloud.com/cpocloudorg-dev/sb/rewardsapis");
apimUrl.query = {
    'client_id': "a765aa63-59f0-44e4-a182-cc7bfd38fec9",
	'client_secret': "uA4bM1vL2jS2sE5oG6oK3uN5wU1eS2bW1qQ5pV1nB2dO3xQ5tR"
};
console.log("AF: apimUrl="+JSON.stringify(apimUrl));

console.log("AF: Declare return codes used in API responses");
var rcOK      = 0;
var rcWarning = 1;
var rcError   = 2;
var rcUnknown = 99;

console.log("AF: Set up to talk to Cloudant");
var dbCredentials = { dbName : 'product_db' };
dbCredentials.host = "45ccfedc-4878-41e6-920b-8de235ae90f0-bluemix.cloudant.com";
dbCredentials.port = 443;
dbCredentials.user = "45ccfedc-4878-41e6-920b-8de235ae90f0-bluemix";
dbCredentials.password = "fee05410105e7a16ed4df2e57a4e95f057afe44f47e52a61b6bc5cdd74794306";
dbCredentials.url = "https://45ccfedc-4878-41e6-920b-8de235ae90f0-bluemix:fee05410105e7a16ed4df2e57a4e95f057afe44f47e52a61b6bc5cdd74794306@45ccfedc-4878-41e6-920b-8de235ae90f0-bluemix.cloudant.com";
var cloudant = require('cloudant')(dbCredentials.url);
var db = cloudant.use(dbCredentials.dbName);
console.log("AF: dbCredentials="+JSON.stringify(dbCredentials));

function errorMsgBalance(account, details) {
	return account==="998"
			? "Error getting points balance.<br />"+details
			: "Invalid Rewards Number.";
}
function successMsgBalance(points) {
	return "You have a balance of "+points+" points.";
}
function errorMsgCheckout(details) {
	return "Error checking out.<br />"+details;
}
function successMsgCheckoutCash(ptype, account, price) {
	var msg = "Your order has been submitted.<br />";
	msg += ptype+" account "+account+" has been billed $"+price+".<br />";
	return msg;
}
function successMsgCheckoutPoints(points, balance) {
	var msg = "Thank you! Your order has been submitted.<br />";
	msg += "Your rewards account has been decreased by "+points+" points.<br />";
	msg += "Your remaining balance is "+balance+" points.<br />";
	return msg;
}

app.get('/', routes.index);
app.get('/users', user.list);

app.get('/api/products', function(request, response) {
	console.log("Get products");
	db = cloudant.use(dbCredentials.dbName);
	var retjson = {"RC":rcOK};
	var products = [];
	var i = 0;
	db.list(function(err, body) {
		if (!err) {
			var len = body.rows.length;
			console.log("******** total # of products -> "+len);
			body.rows.forEach(function(document) {
				db.get(document.id, { revs_info: true }, function(err, doc) {
					i++;
					if (!err) {
						products.push({
							id : doc._id,
							name : doc.name,
							sku : doc.sku,
							price : doc.price,
							points : doc.points
						});
					} else {
						retjson.RC = rcError;
						retjson.msg = "Error getting product.<br />"+err;
					}
					if (i === len) {
						retjson.products = products;
						response.write(JSON.stringify(retjson));
						response.end();
					}
				});
			});
		} else {
			console.log("******** "+err);
			retjson.RC = rcError;
			retjson.msg = "Error getting product list.<br />"+err;
			response.write(JSON.stringify(retjson));
			response.end();
		}
	});
});

// Query rewards points.
app.get("/api/queryPoints", function(req, res) {	
	var retjson = {"RC":rcOK};
	var queryObject = url.parse(req.url,true).query;
	var account = queryObject.account;
	var reqUrl = _.clone(apimUrl);
	reqUrl.pathname += '/Inquiry';
	reqUrl.query.account = account;
	// Failsafe code for account 999
	if (account==="999") {
		retjson.account = account;
		retjson.points = 1000;
		retjson.msg = successMsgBalance(retjson.points);
		console.log("******** FAILSAFE retjson="+JSON.stringify(retjson));
		res.write(JSON.stringify(retjson));
		res.end();
		return;
	}
	console.log("******** Submitting Inquiry request to "+url.format(reqUrl));
	request.get({
		url: url.format(reqUrl),
		json: true
	}, function(err, resp, body) {
		if (body) {
			console.log("******** body="+JSON.stringify(body));
			if (body.RC) {
				retjson.RC = parseInt(body.RC,10);
				if (retjson.RC === 0) {
					retjson.account = body.account;	
					retjson.points = parseInt(body.points,10);
					retjson.msg = successMsgBalance(retjson.points);
				} else {
					retjson.msg = errorMsgBalance(account, body.message);
				}
			} else {
				retjson.RC = 2;
				retjson.msg = errorMsgBalance(account, body.httpCode+": "+body.httpMessage+" - "+body.moreInformation);
			}
		} else {
			retjson.RC = 99;
			retjson.msg = errorMsgBalance(account, err);
		}
		console.log("******** retjson="+JSON.stringify(retjson));
		res.write(JSON.stringify(retjson));
		res.end();
	});
});

// handle check outs
app.get("/api/checkout", function(req, res) {
	var retjson = {"RC":rcOK};
	var queryObject = url.parse(req.url,true).query;
	var ptype = queryObject.ptype;
	var account = queryObject.account;
	var price = queryObject.price;
	var points = queryObject.points;
	// If the account number is passed in as a negative number then we negate the points passed in.
	// So in effect we add the points to the account rather than deduct them.
	if (account<0) {
		account = -account;
		points = -points;
	}
	if (ptype!=="Rewards Points") {
		retjson.points = points - price;
		retjson.msg = successMsgCheckoutCash(ptype, account, price);
		res.write(JSON.stringify(retjson));
		res.end();
	} else if (account==="999") { // Failsafe code for account 999
		retjson.account = account;
		retjson.points = 1000 - points;
		retjson.msg = successMsgCheckoutPoints(points, retjson.points);
		console.log("******** FAILSAFE retjson="+JSON.stringify(retjson));
		res.write(JSON.stringify(retjson));
		res.end();
	} else {
		var reqUrl = _.clone(apimUrl);
		reqUrl.pathname += '/DecrementPoints';
		reqUrl.query.account = account;
		reqUrl.query.points = points;
		console.log("******** Submitting DecrementPoints request to "+url.format(reqUrl));
		request.get({
			url: url.format(reqUrl),
			json: true
		}, function(err, resp, body) {
			if (body) {
				console.log("******** body="+JSON.stringify(body));
				if (body.RC) {
					retjson.RC = parseInt(body.RC,10);
					if (retjson.RC === 0) {
						retjson.account = body.account;	
						retjson.points = parseInt(body.points,10);
						retjson.msg = successMsgCheckoutPoints(points, retjson.points);
					} else {
						retjson.msg = errorMsgCheckout(body.message);
					}
				} else {
					retjson.RC = 2;
					retjson.jsg = errorMsgCheckout(body.httpCode+": "+body.httpMessage+" - "+body.moreInformation);
				}
			} else {
				retjson.RC = 99;
				retjson.msg = errorMsgCheckout(err);
			}
			console.log("******** retjson="+JSON.stringify(retjson));
			res.write(JSON.stringify(retjson));
			res.end();
		});
	}
});

console.log("AF: Create Express server on port " + app.get('port'));
http.createServer(app).listen(app.get('port'), function(){
  console.log("AF: Express server listening on port " + app.get('port'));
});
