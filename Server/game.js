var rs = require('randomstring');

var GAME = {
	instances: [],

	create: function(socket) {
		// generate an instance ID
		var id = rs.generate(6);
		socket.instanceID = id;

		// generate instance details
		this.instances[id] = {
			main: socket,
			players: []
		};

		console.log('Created game ' + id);

		// send connection URL to Main Client
		this.sendConnectionURL(id, socket);
	},

	destroy: function(instanceID) {
		var instance = this.instances[instanceID];

		if (typeof instance != 'undefined') {
			
			// send destroyed event to clients
			instance.main.emit('main.destroyed');
			for (var i = 0; i < instance.players.length; i++) {
				instance.players[i].emit('player.destroyed');
			}

			delete this.instances[instanceID];
		}
	},

	handleConnection: function(socket) {
		// destroy game when environment is disconnected
		socket.on('disconnect', function() {
			GAME.destroy(this.instanceID);
		});

		// create a new game instance
		socket.on('main.create', function() {
			GAME.create(this);
		});

		// create a new player
		socket.on('player.add', function(data) {
			GAME.addPlayer(data.instanceID, socket);
		});

		// send player speed
		socket.on('player.speed', function(data) {
			GAME.sendPlayerSpeed(data, socket);
		});

		// send player vibration
		socket.on('main.vibrate', function(data) {
			GAME.sendVibration(data, socket);
		});
	},

	sendConnectionURL: function(id, socket) {
		var url = "http%3A%2F%2F46.101.186.206%3A3000%2Fg%2F" + id;

		socket.emit('main.connectionURL', {
			url: url
		});
	},

	addPlayer: function(instanceID, socket) {
		socket.instanceID = instanceID;
		var instance = this.instances[instanceID];

		if (typeof instance != 'undefined') {
			console.log("Adding player to " + instanceID);

			if (instance.players.length < 2) {
				instance.players.push(socket);
				instance.main.emit('main.playerAdded');
				socket.emit('player.added', {
					player: instance.players.length - 1
				});
			} else {
				socket.emit('player.limitReached');
			}
		}

	}, 

	sendPlayerSpeed: function(data, socket) {
		var instance = this.instances[data.instanceID];

		if (typeof instance != 'undefined') {
			instance.main.emit("main.playerSpeed", {
				player: data.player,
				speed: data.speed
			});
		}

	},

	sendVibration: function(data, socket) {
		var instance = this.instances[socket.instanceID];

		if (typeof instance != 'undefined') {
			var player = instance.players[data.player];

			if (typeof player != 'undefined') {
				player.emit('player.vibrate', {type: data.type});
			}
		}
	}
};

module.exports = GAME;