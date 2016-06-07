
var GAME = {

	socket: {},
	number_of_players: 0,
	connectionURL: "",
	players: [],
	ball: {},
	screen: {},
	started : false,
	difficulty: 0,
	sounds: [],
	images: [],

	init: function() {
		this.cacheDOM();
		
		this.initSocket();
		this.initScreen();
		this.initAudio();
		this.initImages();
		this.initBall();

		this.bindEvents();
	},

	cacheDOM: function() {
		// cache all views
		this.$views = $(".view");

		// cache Select Players View
		this.selectPlayersView = {};
		this.selectPlayersView.$view  = $(".view.selectPlayers");
		this.selectPlayersView.$btn   = this.selectPlayersView.$view.find(".btn");

		// cache Select Difficulty View
		this.selectDifficultyView = {};
		this.selectDifficultyView.$view  = $(".view.selectDifficulty");
		this.selectDifficultyView.$btn   = this.selectDifficultyView.$view.find(".btn");

		// cache Connect Players View
		this.connectPlayersView = {};
		this.connectPlayersView.$view        = $(".view.connectPlayers");
		this.connectPlayersView.$title       = this.connectPlayersView.$view.find(".title");
		this.connectPlayersView.$name        = this.connectPlayersView.$view.find("#name");
		this.connectPlayersView.$qr_code     = this.connectPlayersView.$view.find(".qr-code");
		this.connectPlayersView.$qr_code_img = this.connectPlayersView.$qr_code.find("img");

		// cache Gameplay View
		this.gameplayView   = {};
		this.gameplayView.p = [];
		this.gameplayView.$view     = $(".view.gameplay");
		this.gameplayView.$score    = this.gameplayView.$view.find('#score');
		this.gameplayView.$p1_name  = this.gameplayView.$view.find('#p1-name');
		this.gameplayView.$p2_name  = this.gameplayView.$view.find('#p2-name');
		this.gameplayView.scene     = document.getElementById('scene');
		this.gameplayView.scene.ctx = this.gameplayView.scene.getContext('2d');

		// cache Winner View
		this.winnerView   = {};
		this.winnerView.$view    = $(".view.winner");
		this.winnerView.$title   = this.winnerView.$view.find('.title');
		this.winnerView.$restart = this.winnerView.$view.find('#restart');
	},

	bindEvents: function() {
		this.socket.on('main.connectionURL', function(data) {
			GAME.connectionURL = data.url;
		});

		this.socket.on('main.playerAdded', function(data) {
			GAME.handlePlayerAdding();
		});

		this.socket.on('main.playerSpeed', function(data) {
			GAME.setPlayerSpeed(data.player, data.speed);
		});

		this.socket.on('main.destroyed', function(data) {
			GAME.restart();
		});

		this.winnerView.$restart.click(function() {
			GAME.restart();
		});

		this.selectPlayersView.$btn.click(function() {
			GAME.number_of_players = $(this).data('number');
			GAME.renderConnectionView("Player 1");
		});

		this.selectDifficultyView.$btn.click(function() {
			GAME.difficulty = $(this).data('value');
			GAME.renderGameplayView();
		});

		this.sounds.play_bg.addEventListener('ended', function() {
		    this.currentTime = 0;
		    this.play();
		}, false);

		$(document).keyup(function(e) {
			if (e.keyCode == 27) {
				GAME.stop();
				GAME.restart();
			}
		});
	},

	initAudio: function() {
		this.sounds.hit_p0 = {};
		this.sounds.hit_p0.index = 0;
		this.sounds.hit_p0.data  = [];
		for (var i = 0; i < 3; i++) {
			this.sounds.hit_p0.data[i] = new Audio('./Main/sounds/hit.mp3');
		}

		this.sounds.hit_p1 = {};
		this.sounds.hit_p1.index = 0;
		this.sounds.hit_p1.data  = [];
		for (var i = 0; i < 3; i++) {
			this.sounds.hit_p1.data[i] = new Audio('./Main/sounds/hit.mp3');
		}

		this.sounds.play_bg    = new Audio('./Main/sounds/play_bg.mp3');
		this.sounds.connect_bg = new Audio('./Main/sounds/connect_bg.mp3');

		this.sounds.play_bg.volume    = 0.5;
		this.sounds.connect_bg.volume = 0.5;
	},

	initImages: function() {
		this.images.player_bg = new Image();
		this.images.player_bg.src = './Main/img/pipe.jpg';
	},

	initSocket: function() {
		this.socket = io();
	},

	initScreen: function() {
		this.screen.width  = $(window).width();
		this.screen.height = $(window).height();

		this.gameplayView.scene.width  = this.screen.width;
		this.gameplayView.scene.height = this.screen.height;

		window.requestAnimFrame =
		    window.requestAnimationFrame ||
		    window.webkitRequestAnimationFrame ||
		    window.mozRequestAnimationFrame ||
		    window.oRequestAnimationFrame ||
		    window.msRequestAnimationFrame ||
		    function (callback) {
		        window.setTimeout(callback, 1000 / 60);
			}
	},

	initGame: function() {
		this.drawPlayer(0);
		this.drawPlayer(1);

		setTimeout(function() {
			GAME.start();
		}, 1000);
	},

	initScore: function() {
		this.gameplayView.$score.html("0 - 0");
		this.players[0].score = 0;
		this.players[1].score = 0;
	},

	initPlayer: function(index, type) {
		this.players.push({});

		this.players[index].width  = 40;
		this.players[index].height = this.screen.height / 3;
		this.players[index].maxY   = this.screen.height - this.players[index].height;
		this.players[index].y      = this.players[index].maxY / 2;
		this.players[index].score  = 0;
		this.players[index].speed  = 0;
		this.players[index].type   = type;

		if (type == 'player') {
			var name = this.connectPlayersView.$name.val();
			if (name.length > 0) {
				this.players[index].name = name;
			} else {
				this.players[index].name = "Player " + (index + 1);
			}
		} else {
			this.players[index].name = "CPU";
		}

		// compute x
		if (index == 0) {
			this.players[index].x = 20;
		} else {
			this.players[index].x = this.screen.width - this.players[index].width - 20;
		}
	},

	initBall: function() {
		this.ball.radius = 20;
		this.ball.x      = this.screen.width / 2;
		this.ball.y      = this.screen.height / 2;

		this.ball.dx = (Math.random() < 0.5) ? -1 : 1;
		this.ball.dy = -1;

		this.ball.speed   = 8;
		this.ball.angle  = Math.PI / 5 * Math.random();
	},

	handlePlayerAdding: function() {
		var index = this.players.length;
		this.initPlayer(index, 'player');

		if (index == 0) {
			if (this.number_of_players == 2) {
				this.renderConnectionView("Player 2");
			} else {
				this.initPlayer(1, 'cpu');
				this.renderDifficultyView();
			}
		} else {
			this.renderGameplayView();
		}
	},

	setPlayerSpeed: function(index, speed) {
		this.players[index].speed = speed;
	},

	computeCPUSpeed: function(index) {
		var base_speed = Math.sin(this.ball.angle) * this.ball.speed / 6;
		var max_speed, speed;

		if (this.difficulty == 0 || this.difficulty == 1) {
			max_speed = 0.9;
			speed = this.ball.dy * base_speed;
		}
		else if (this.difficulty == 2) {
			max_speed = 0.9;

			var center = this.players[index].y + this.players[index].height / 2;
			var dp     = (this.ball.y - center) < 0 ? -1 : 1;

			if (Math.abs(this.ball.y - center) > this.players[index].height / 4) {
				speed = dp * max_speed;
			} else {
				speed = dp * base_speed;
			}
		}
		else if (this.difficulty == 3) {
			max_speed = 2;

			var center = this.players[index].y + this.players[index].height / 2;
			var dp     = (this.ball.y - center) < 0 ? -1 : 1;

			if (Math.abs(this.ball.y - center) > this.players[index].height / 8) {
				speed = dp * max_speed;
			} else {
				speed = dp * base_speed;
			}
		}

		if (speed > max_speed)  speed = max_speed; 
		if (speed < -max_speed) speed = -max_speed;

		this.setPlayerSpeed(index, speed);
	},

	computePlayerVelocity: function(index) {
		var player = this.players[index];

		if (player.type == 'cpu') {
			this.computeCPUSpeed(index);
		}

		var y = parseInt(player.y + player.speed * 5);

		if (y > 0 && y < player.maxY) {
			this.players[index].y = y;
		}
	},

	computeBallVelocity: function() {
		// check top and bottom wall collision
		if (this.ball.y < this.ball.radius || this.ball.y > this.screen.height - this.ball.radius) {
			this.ball.dy = (-1) * this.ball.dy;
		}

		// check player 0 collision
		var player = this.players[0];
		if (this.ball.x < 20 + this.ball.radius + player.width) {
			if (this.ball.y + this.ball.radius > player.y && this.ball.y - this.ball.radius < player.y + player.height) {
				this.ball.dx     = 1;
				this.ball.speed += Math.abs(player.speed);
				this.ball.angle  = Math.PI / 5 * Math.random();

				this.playAudio('hit_p0');
				this.vibrate(0, 'short');
			} else {
				this.markPoint(1);
				this.vibrate(0, 'long');
				this.vibrate(1, 'long');
			}
		}

		// check player 1 collision
		var player = this.players[1];
		if (this.ball.x > this.screen.width - 20 - this.ball.radius - player.width) {
			if (this.ball.y + this.ball.radius > player.y && this.ball.y - this.ball.radius < player.y + player.height) {
				this.ball.dx = -1;
				this.ball.speed += Math.abs(player.speed);
				this.ball.angle  = Math.PI / 5 * Math.random();

				this.playAudio('hit_p1');
				this.vibrate(1, 'short');
			} else {
				this.markPoint(0);
				this.vibrate(0, 'long');
				this.vibrate(1, 'long');
			}
		}

		if (this.difficulty == 0) {
			this.ball.x = this.ball.x + this.ball.dx * Math.cos(this.ball.angle) * this.ball.speed / 2;
			this.ball.y = this.ball.y + this.ball.dy * Math.sin(this.ball.angle) * this.ball.speed / 2;
		} else {
			this.ball.x = this.ball.x + this.ball.dx * Math.cos(this.ball.angle) * this.ball.speed;
			this.ball.y = this.ball.y + this.ball.dy * Math.sin(this.ball.angle) * this.ball.speed;
		}
	},

	drawPlayer: function(index) {
		var ctx = this.gameplayView.scene.ctx;

		ctx.save();
        ctx.fillStyle = ctx.createPattern(this.images.player_bg, 'repeat');
        ctx.translate(GAME.players[index].x, GAME.players[index].y);
        ctx.fillRect(0, 0, GAME.players[index].width, GAME.players[index].height);
		ctx.restore();

		ctx.save();
		ctx.strokeStyle = "#aaa";
		ctx.lineWidth    = 1;
		ctx.translate(this.players[index].x, this.players[index].y);
		ctx.strokeRect(0, 0, this.players[index].width, this.players[index].height);
		ctx.restore();
	},

	drawBall: function() {
		var ctx = this.gameplayView.scene.ctx;

		ctx.save();
		ctx.beginPath();
      	ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, 2 * Math.PI, false);
      	ctx.fillStyle = "#1BD256";
      	ctx.fill();
      	ctx.restore();
	},

	draw: function() {
		var ctx = this.gameplayView.scene.ctx;
		ctx.clearRect(0, 0, this.screen.width, this.screen.height);

		for (var i = 0; i < this.players.length; i++) {
			this.computePlayerVelocity(i);
			this.drawPlayer(i);
		}

		this.computeBallVelocity();
		this.drawBall();
	},

	playAudio: function(sound) {
		if (typeof this.sounds[sound].index != 'undefined') {
			var index = this.sounds[sound].index % 3;

			this.sounds[sound].data[index].play();
			this.sounds[sound].index ++;
		} else {
			this.sounds[sound].play();
		}
	},

	stopAudio: function(sound) {
		this.sounds[sound].pause();
		this.sounds[sound].currentTime = 0;
	},

	markPoint: function(index) {
		this.players[index].score ++;

		if (this.players[index].score >= 7) {
			this.renderScore(function() {
				GAME.renderWinnerView(index);
			});
		} else {
			this.initBall();
			this.renderScore(function() {
				GAME.start();
			});
		}

	},

	renderScore: function(callback) {
		this.stop();

		this.gameplayView.$score.addClass('active');
		$(this.gameplayView.scene).removeClass('active');

		setTimeout(function() {
			var score = GAME.players[0].score + " - " + GAME.players[1].score;
			GAME.gameplayView.$score.html(score);
		}, 1000);

		setTimeout(function() {
			GAME.gameplayView.$score.removeClass('active');
			$(GAME.gameplayView.scene).addClass('active');
		}, 1500);

		setTimeout(function() {
			if (typeof callback != 'undefined') {
				callback();
			}
		}, 2000);
	},

	renderSelectionView: function() {
		this.$views.hide();
		this.selectPlayersView.$view.show();

		this.stopAudio('play_bg');
		this.playAudio('connect_bg');
	},

	renderDifficultyView: function() {
		this.$views.hide();
		this.selectDifficultyView.$view.show();

		this.stopAudio('play_bg');
		this.playAudio('connect_bg');
	},

	renderConnectionView: function(title) {
		this.$views.hide();
		this.connectPlayersView.$view.show();
		this.connectPlayersView.$name.val('');

		var qr_img = "http://api.qrserver.com/v1/create-qr-code/?color=000000&bgcolor=FFFFFF&data=" + this.connectionURL + "&qzone=1&margin=0&size=300x300&ecc=L";
		this.connectPlayersView.$qr_code_img.attr("src", qr_img);

		this.connectPlayersView.$title.html(title);

		this.stopAudio('play_bg');
		this.playAudio('connect_bg');
	},

	renderGameplayView: function() {
		this.$views.hide();
		this.gameplayView.$view.show();

		this.gameplayView.$p1_name.html(this.players[0].name);
		this.gameplayView.$p2_name.html(this.players[1].name);

		this.initGame();

		this.stopAudio('connect_bg');
		this.playAudio('play_bg');
	},

	renderWinnerView: function(index) {
		this.$views.hide();
		this.winnerView.$view.show();
		this.winnerView.$title.html(this.players[index].name + " won!");

		this.stopAudio('play_bg');
		this.playAudio('connect_bg');
	},

	vibrate: function(player, type) {
		this.socket.emit('main.vibrate', {
			player: player,
			type: type
		});
	},

	create: function() {
		this.socket.emit('main.create');
		this.renderSelectionView();
	},

	restart: function() {
		this.initBall();
		this.initScore();
		this.renderDifficultyView();
	},

	start: function() {
		this.started = true;
	},

	stop: function() {
		this.started = false;
	},

	run: function() {
		if (GAME.started) {
			GAME.draw();
		}
		requestAnimFrame(GAME.run);
	}

}

GAME.init();
GAME.create();
GAME.run();

