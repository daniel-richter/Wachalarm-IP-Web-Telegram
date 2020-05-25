// Module laden
const fs = require('fs');
const express = require('express');
const app = express();
const http = require('http');
const https = require('https'); 
const webserver = https.createServer({
  key: fs.readFileSync('./misc/server.key', 'utf8'),
  cert: fs.readFileSync('./misc/server.cert', 'utf8')
}, app);
const io = require('socket.io').listen(webserver);
const io_api = require('socket.io-client');
const async = require('async');
const path = require('path');
const favicon = require('serve-favicon');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const passport = require('passport');
const twit = require('twit');
const uuidv4 = require('uuid/v4');
const turf = require('@turf/turf');

// Basis-Konfiguration laden
var app_cfg = require('./server/app_cfg.js');

// Express-Einstellungen
app.set('views', path.join(__dirname, 'views'));
app.locals.basedir = app.get('views');
app.set('view engine', 'pug');
if (!app_cfg.global.development) {
  app.set('view cache', true);
};
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));

// Endpoint-API
if (app_cfg.endpoint.enabled) {
  const remote_api = io_api.connect(app_cfg.global.remoteapi, {
    reconnect: true
  });
} else {
  const remote_api;
};


// Scripte einbinden
var sql_cfg = require('./server/sql_cfg')(fs, bcrypt, app_cfg);
var sql = require('./server/sql_qry')(sql_cfg, uuidv4, turf, app_cfg);
var brk = require('./server/broker')(twit, uuidv4, app_cfg);
var waip = require('./server/waip')(io, sql, brk, async, app_cfg);
var socket = require('./server/socket')(io, io_api, sql, app_cfg, waip);
var udp = require('./server/udp')(app_cfg, waip, sql);
var auth = require('./server/auth')(app, app_cfg, sql_cfg, async, bcrypt, passport, io);
var routes = require('./server/routing')(app, sql, uuidv4, app_cfg, passport, auth, waip, udp);

// Server starten
webserver.listen(app_cfg.global.https_port, function() {
  sql.db_log('Anwendung', 'Wachalarm-IP-Webserver auf Port ' + app_cfg.global.https_port + ' gestartet');
});

// Redirect all HTTP traffic to HTTPS
http.createServer(function(req, res) {
  var host = req.headers.host;
  // prüfen ob host gesetzt, sonst 404
  if (typeof host !== 'undefined' && host) {
    // Anfrage auf https umleiten
    host = host.replace(/:\d+$/, ":" + app_cfg.global.https_port);
    res.writeHead(301, {
      "Location": "https://" + host + req.url
    });
    res.end();
  } else {
    // HTTP status 404: NotFound
	res.writeHead(404, {
	  "Content-Type": "text/plain"
	});
	res.write("404 Not Found - use https instead!\n");
	res.end();
  };
}).listen(app_cfg.global.http_port);
