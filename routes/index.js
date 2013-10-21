/**********************************************************************
example.js
Example of the node-rss feed parser

**********************************************************************/
var sys = require('sys');
var rss = require('../node-rss');
/*
 * GET home page.
 */
 var http = require('http');

exports.index = function(req, res){
	/**********************************************************************
	Example One:
	Getting a remote RSS feed and parsing
	rss.parseURL(feed_url, use_excerpt, callback);
	**********************************************************************/
	// URL of the feed you want to parse
	var feed_url = 'http://news.dbanotes.net/rss';
	
	var response = rss.parseURL(feed_url, function(articles) {
	    sys.puts(articles.length);
	    res.render('index', { title: '技术民工每天必看的文章' , articles: articles});
	});

  
};
exports.m = function(req, res){
	console.log(req.session.user.level);
  res.render('mdlist', { 
  	title: '定投系统' , 
  	uname: req.session.user.cname,
  	level: req.session.user.level
  });
};
exports.logout = function(req, res){
	req.session.user = null;
    res.redirect('/');
}
exports.setting = function(req, res){
	res.render('setting', { 
		title: '定投系统' , 
  		uname: req.session.user.cname,
  		level: true
	});
}