






/**
 * Module dependencies.
 */

var express = require('express')
, domain = require('domain')
, routes = require('./routes')
, http = require('http')
, path = require('path')
, date = require('./lib/date').formate
, app = express();

// all environments
app.set('port', process.env.PORT || 9876);
app.engine('.html', require('ejs').__express);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.set('view cache', false);
app.set('env', 'production')
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('spricity'));
app.use(express.session({secret: 'spricity'}));



//引入一个domain的中间件，将每一个请求都包裹在一个独立的domain中
//domain来处理异常
app.use(function (req,res, next) {
  var d = domain.create();
  //监听domain的错误事件
  d.on('error', function (err) {
    logger.error(err);
    res.statusCode = 500;
    res.json({sucess:false, messag: '服务器异常'});
    d.dispose();
  });

  d.add(req);
  d.add(res);
  d.run(next);
});


app.use(app.router);
app.use(express.static(path.join(__dirname, 'www')));


// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/m', routes.m);
app.get('/setting', routes.setting);
app.get('/logout', routes.logout);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});


/**********************************************************************
Example Two:
Getting a local RSS feed and parsing
rss.parseFile(feed_file, use_excerpt, callback);
**********************************************************************/
/*
var response = rss.parseFile('nodeblogs.com.feed.xml', function(articles) {
    sys.puts(articles.length);
    for(i=0; i<articles.length; i++) {
        sys.puts("Article: "+i+", "+
                 articles[i].title+"\n"+
                 articles[i].link+"\n"+
                 articles[i].description+"\n"+
                 articles[i].content
                );
    }
});
*/