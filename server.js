var express = require('express')
  , routes = require('./routes/index')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

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
var db;
var cloudant;
var dbCredentials = { dbName : 'product_db' };
console.log("AF: dbCredentials="+JSON.stringify(dbCredentials));

app.get('/', routes.index);
app.get('/users', user.list);

console.log("AF: Create Express server on port " + app.get('port'));
http.createServer(app).listen(app.get('port'), function(){
  console.log("AF: Express server listening on port " + app.get('port'));
});
