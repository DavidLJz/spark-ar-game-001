import {
	Diagnostics, FaceTracking, Scene, Reactive, Time, Animation
} from './Modules.js';

const PlayerInterface = class {
	constructor (sprite) {
		this.sprite = sprite;
		this.subscriptions = {};
		this.lifes = 3;
		this.onDeathCallback = null;

		this.sprite.transform.y = Reactive.val(400).add(this.sprite.bounds.height);
	}

	getBounds2d() {
		return this.sprite.bounds;
	}

	damage() {
		this.lifes--;

		if ( this.lifes === 0 && this.onDeathCallback ) {
			this.onDeathCallback();
		}

		return this;
	}

	activate() {
		this.lifes = 3;
		this.sprite.transform.y = Reactive.val(400).add(this.sprite.bounds.height);

		return this;
	}

	onDeath(callback) {
		if ( typeof callback !== 'function' ) {
			throw new Error('must be a function');
		}

		this.onDeathCallback = callback;

		return this;
	}

	moveHorizontally(x) {
		this.sprite.transform.x = x;
		return this;
	}

	getSubscriptions() {
		return this.subscriptions;
	}

	unsubscribeTo(boundProperties) {
		if ( boundProperties && !Array.isArray(boundProperties) ) {
			throw new Error('must be array');
		}

		if ( !boundProperties ) {
			boundProperties = this.subscriptions;
		}

		for ( const i in boundProperties ) {
			const sub = this.subscriptions[i] || null;

			if (sub) sub.unsubscribe();
		}

		return this;
	}

	onChangeHorizontalPosition(callback, addToSnapshot={}) {
		if ( !callback || typeof callback !== 'function' ) {
			throw new Error('must be callback');
		}

		const bound = this.sprite.bounds.x;

		let snapshotOf = { 
			x : this.sprite.bounds.x, 
			y : this.sprite.bounds.y,
			w : this.sprite.bounds.width,
			h : this.sprite.bounds.height
		};

		if ( typeof addToSnapshot === 'object' ) {
			snapshotOf = { ...snapshotOf, ...addToSnapshot };
		}

		this.subscriptions['x'] = bound.monitor().subscribeWithSnapshot(
			snapshotOf, (event, snapshot) => { callback(snapshot) }
		);

		return this;
	}
};

const EnemyInterface = class {
	constructor (sprite) {
		this.sprite = sprite;
		this.subscriptions = {};
		this.active = false;
		this.timeDriver = null;
	}

	isActive() {
		return this.active;
	}

	activate(x=null) {
		this.active = true;
		this.startMovement(x);

		return this;
	}

	startMovement(x=null) {
		this.sprite.hidden = Reactive.val(true);;

		this.timeDriver = null;

		this.sprite.transform.y = Reactive.val(-20).sub(this.sprite.bounds.height);
		
		if ( !x ) {
			x = Math.floor(Math.random() * (270 - 1)) + 1;
		}

		this.sprite.transform.x = Reactive.val(x);

		this.sprite.hidden = Reactive.val(false);

		this.beginMovement();

		return this;
	}

	unfreeze() {
		this.active = true;

		if ( this.timeDriver ) {
			this.timeDriver.start();
		}

		return this;
	}

	freeze() {
		this.active = false;

		if ( this.timeDriver && this.timeDriver.isRunning() ) {
			this.timeDriver.stop();
		}

		return this;
	}

	deactivate() {
		this.active = false;
		this.sprite.hidden = Reactive.val(true);;

		this.sprite.transform.y = Reactive.val(-20).sub(this.sprite.bounds.height);

		return this;
	}

	getBounds2d() {
		return this.sprite.bounds;
	}

	getSubscriptions() {
		return this.subscriptions;
	}

	unsubscribeTo(boundProperties) {
		if ( boundProperties && !Array.isArray(boundProperties) ) {
			throw new Error('must be array');
		}

		if ( !boundProperties ) {
			boundProperties = this.subscriptions;
		}

		for ( const i in boundProperties ) {
			const sub = this.subscriptions[i] || null;

			if (sub) sub.unsubscribe();
		}

		return this;
	}

	beginMovement() {
		this.timeDriver = Animation.timeDriver({
			durationMilliseconds: 3500,
		});

		const sampler = Animation.samplers.linear(-94, 700);

		const animation = Animation.animate(this.timeDriver, sampler);

		this.sprite.transform.y = animation;

		this.timeDriver.start();

		this.timeDriver.onCompleted().subscribe(() => {
			if ( this.active ) {
				this.restartMovement();
			}
		});

		return this;
	}

	onChangeVerticalPosition(callback) {
		if ( !callback || typeof callback !== 'function' ) {
			throw new Error('must be callback');
		}

		const bound = this.sprite.bounds.y;

		this.subscriptions['y'] = bound.monitor().subscribeWithSnapshot(
			{ val : this.sprite.bounds.y },
			(event, snapshot) => { callback(snapshot.val) }
		);

		return this;
	}
};

const cubicMap = (x) => {
  const A = 0.65;
  const C = 1/A - A*A;

  return C*x + x*x*x;
};

const CollisionDetector = {
	checkCollision : function (positionA, positionB, lengthA, lengthB) {
    return Reactive.abs(
    	positionA.sub(positionB)
    ).le(
    	Reactive.add(lengthA.div(2), lengthB.div(2))
    );
	},

	checkCollision2d : function (ObjectA, ObjectB) {
		return Reactive.andList([
			this.checkCollision(ObjectA.x, ObjectB.x, ObjectA.width, ObjectB.width),
			this.checkCollision(ObjectA.y, ObjectB.y, ObjectA.height, ObjectB.height),
		]);
	}
};

export const GameInterface = class {
	constructor(
		face, playerSprite, entityMaterials,  
		canvas, gameStateText, playerStateText, timeText
	) {
		this.face = face;
		this.player = new PlayerInterface(playerSprite);

		this.entityMaterials = entityMaterials;

		this.enemies = [];
		this.canvas = canvas;

	  this.faceTracking = null;
	  this.collisionWatch = [];
	  this.enemyMovementWatch = [];

	  this.gameTime = Reactive.val(0);
	  this.gameTimeWatch = null;

	  this.timeText = timeText;
	  this.timeText.hidden = Reactive.val(true);;

	  this.gameStateText = gameStateText;
	  this.gameStateText.hidden = Reactive.val(true);;

	  this.playerStateText = playerStateText;
	  this.playerStateText.hidden = Reactive.val(true);;

		this.state = 'idle'; // paused, over, started
	}

	start() {
		(async () => {
			this.state = 'started';

		  this.gameStateText.hidden = Reactive.val(true);;
		  this.gameStateText.text = '';

		  this.timeText.hidden = Reactive.val(true);;
		  this.timeText.text = '';

		  this.gameTime = Reactive.val(0);

		  this.logGameTime();

			this.monitorPlayerLife().enablePlayerMovement().setEnemySpawner();
		})();

		return this;
	}

	end() {
		(async () => {
			this.state = 'over';

			this.faceTracking.unsubscribe();

			for ( const enemy of this.enemies ) {
				enemy.deactivate();
			}
				
			for ( const event of this.collisionWatch ) {
				event.unsubscribe();
			}
				
			for ( const event of this.enemyMovementWatch ) {
				event.unsubscribe();
			}

			this.enemies = [];
			this.collisionWatch = [];
			this.enemyMovementWatch = [];

		  Time.clearInterval(this.gameTimeWatch);
		})();

		return this;
	}

	lose() {
		Diagnostics.log('Game over');

		this.gameStateText.text = 'GAME OVER';
		this.gameStateText.hidden = Reactive.val(false);

	  this.playerStateText.hidden = Reactive.val(true);;
	  this.playerStateText.text = '';

		this.end();

		return this;
	}

	resume() {
		this.state = 'started';
		this.enablePlayerMovement();

		this.gameStateText.hidden = Reactive.val(true);;

		if ( this.enemies.length > 0 ) {
			for ( const enemy of this.enemies ) {
				if ( enemy.isActive() ) continue;
				
				enemy.unfreeze();
			}
		}

		this.logGameTime(true);
	}

	pause() {
		this.state = 'paused';
		this.disablePlayerMovement();

		this.gameStateText.text = 'PAUSED';
		this.gameStateText.hidden = Reactive.val(false);

		if ( this.enemies.length > 0 ) {
			for ( const enemy of this.enemies ) {
				if ( !enemy.isActive() ) continue;
				
				enemy.freeze();
			}
		}

		Time.clearInterval(this.gameTimeWatch);

		return this;
	}

	logGameTime(resume=false) {
		this.timeText.hidden = Reactive.val(false);

		this.gameTimeWatch = Time.setInterval(async time => {
			// seconds since setInterval first started
			const t = Reactive.div( time, Reactive.val(1000) ).round();
			
			// if resume add to gameTime value, else set
			this.gameTime = resume ? this.gameTime.add(t) : t;

			const m = this.gameTime.div(60);
			const s = this.gameTime.mod(60);

			this.timeText.text = m.ge(1).ifThenElse(
				// 1m 30s
				m.round().toString().concat('m ').concat(
					s.ge(1).ifThenElse(
						s.round().toString().concat('s'), ''
					)
				),

				// 30s
				this.gameTime.toString().concat('s')
			);
		}, 1000);
	}

	monitorPlayerLife() {
		(async () => {
			this.player.activate();
	  
	  	this.playerStateText.text = 'LIFES: ' + this.player.lifes;
	  	this.playerStateText.hidden = Reactive.val(false);

			this.player.onDeath(() => {
				Diagnostics.log('player is dead');

				this.lose();
			});
		})();

		return this;
	}

	setEnemySpawner() {
		(async () => {
			this.generateEnemy();

			Diagnostics.log('enemies spawning');
		})();

		return this;
	}

	generateEnemy() {
		(async () => {
			if ( this.enemies.length >= 3 ) {
				for ( const enemy of this.enemies ) {
					if ( enemy.isActive() ) continue;

					enemy.activate();
					return;
				}

				return;
			}

			let rand = Math.floor(Math.random() * (20 - 13)) + 13;

			const material = this.entityMaterials.meteors[
				(Math.random() * this.entityMaterials.meteors.length) | 0
			];

			const enemySprite = await Scene.create("PlanarImage", {
	      "name": `enemy-` + this.enemies.length,
	      "width": 10000 * rand,
	      "height": 10000 * rand,
	      "hidden": false,
	      'material' : material
	    });

	    const enemy = new EnemyInterface(enemySprite);

	    this.enemies.push(enemy);
	    this.canvas.addChild(enemySprite);

			this.monitorCollision(enemy, this.player, () => {
				Diagnostics.log('collision detected');

				this.player.damage();
				this.playerStateText.text = 'LIFES: ' + this.player.lifes;
			});

			enemy.getBounds2d().y.ge(400).onOn().subscribe(() => {
				if ( this.state == 'started' && this.enemies.length < 3 ) {	
					this.generateEnemy();
				}
			});

	    enemy.activate();
		})();

	  return this;
	}

	enablePlayerMovement() {
		const faceTurning = this.face.cameraTransform.rotationY;		  

		this.faceTracking = faceTurning.monitor().subscribeWithSnapshot(
	    { faceTurning }, 
	    (event, snapshot) => {
	      let turnRadius = cubicMap(snapshot.faceTurning);
	      let spriteHorizontalPosition = 275 * (1 + turnRadius) / 2;
	  
	      this.player.moveHorizontally(spriteHorizontalPosition);
	    } 
	  );

	  Diagnostics.log('enabled player controls');

		return this;
	}

	disablePlayerMovement() {
		if ( !this.faceTracking ) return;

		this.faceTracking.unsubscribe();

		Diagnostics.log('disabled player controls');

		return this;
	}

	monitorCollision(entityA, entityB, onCollision) {
		(async () => {
			if ( typeof onCollision !== 'function' ) return;

      const col = CollisionDetector.checkCollision2d(
				entityA.getBounds2d(), entityB.getBounds2d()
			);

			this.collisionWatch.push(
				col.onOn().subscribe(onCollision)
			);
		})();

		return this;
	}
};