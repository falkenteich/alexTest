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

app.get('/', routes.index);
app.get('/users', user.list);

console.log("AF: Create Express server on port " + app.get('port'));
http.createServer(app).listen(app.get('port'), function(){
  console.log("AF: Express server listening on port " + app.get('port'));
});
