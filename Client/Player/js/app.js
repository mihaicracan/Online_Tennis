
var APP = {

	socket: io(),
	player: 0,
	connected: false,
	instanceID: window.location.pathname.replace("/g/", ""),
	noSleep: new NoSleep(),

	init: function() {
		this.initGyro();
		this.initVibration();
		this.cacheDOM();
		this.bindEvents();
	},

	initGyro: function() {
		gyro.frequency = 100;
	},

	initVibration: function() {
		navigator.vibrate = navigator.vibrate || navigator.webkitVibrate || navigator.mozVibrate || navigator.msVibrate;
	},

	cacheDOM: function() {
		// cache all views
		this.$views = $(".view");

		// cache Loading View
		this.loadingView = {};
		this.loadingView.$view = $(".view.loading");

		// cache Disconnected View
		this.disconnectedView = {};
		this.disconnectedView.$view = $(".view.disconnected");

		// cache Calibrate View
		this.calibrateView = {};
		this.calibrateView.$view = $(".view.calibrate");
		this.calibrateView.$btn  = this.calibrateView.$view.find("#btn");

		// cache Play View
		this.playView = {};
		this.playView.$view = $(".view.play");
	},

	bindEvents: function() {
		this.socket.on('player.added', function(data) {
			APP.handlePlayerAdding(data);
		});

		this.socket.on('player.vibrate', function(data) {
			APP.vibrate(data.type);
		});

		this.socket.on('player.destroyed', function() {
			APP.renderDisconnectedView();
		});

		this.calibrateView.$btn.click(function() {
			APP.calibrate();
		});
	},

	calibrate: function() {
		APP.noSleep.enable();
		APP.renderLoadingView();

		gyro.calibrate();

		setTimeout(function() {
			APP.addPlayer();
		}, 500);
	},

	vibrate: function(type) {
		if (navigator.vibrate) {
			if (type == 'short') {
				navigator.vibrate(45);
			} else {
				navigator.vibrate([100, 100, 100, 100, 1000]);
			}
		}
	},

	addPlayer: function() {
		this.socket.emit('player.add', {
			instanceID: this.instanceID
		});
	},

	handlePlayerAdding: function(data) {
		this.player = data.player;
		this.connected = true;

		APP.renderPlayView();
	},

	trackMove: function() {
		gyro.startTracking(function(o) {
			if (APP.connected) {
				var speed = o.y;
				APP.sendPlayerSpeed(speed);
			}
		});
	},

	sendPlayerSpeed: function(speed) {
		this.socket.emit('player.speed', {
			instanceID: this.instanceID,
			player: this.player,
			speed: speed
		});
	},

	renderLoadingView: function() {
		this.$views.hide();
		this.loadingView.$view.show();
	},

	renderDisconnectedView: function() {
		this.$views.hide();
		this.disconnectedView.$view.show();

		APP.noSleep.disable();
	},

	renderCalibrateView: function() {
		this.$views.hide();
		this.calibrateView.$view.show();
	},

	renderPlayView: function() {
		this.$views.hide();
		this.playView.$view.show();

		APP.trackMove();
	},

	run: function() {
		APP.renderCalibrateView();
	}

}

APP.init();
APP.run();

