var express = require('express');
var app     = express();
var http    = require('http').Server(app);
var io      = require('socket.io')(http);
var device  = require('express-device');
var game    = require('./Server/game');

// configure express to use device plugin
app.use(device.capture());

// set the folder with static files
app.use(express.static('Client'));

// allow the Main view just for desktop, tv and tablet
app.get('/', function(req, res){
	if ( (["desktop", "tv", "tablet"]).indexOf(req.device.type) > -1) {
		res.sendFile(__dirname + '/Client/Main/index.html');
	} else {
		res.send('Please use your PC or Tablet to access this Game.\n');
	}
});

// allow the Mobile view just for phones
app.get('/g/*', function(req, res){
	if (req.device.type == "phone") {
		res.sendFile(__dirname + '/Client/Player/index.html');
	} else {
		res.redirect('/');
	}
});

io.on('connection', function(socket){
  	game.handleConnection(socket);
});

http.listen(3000, function(){
  	console.log('listening on *:3000');
});