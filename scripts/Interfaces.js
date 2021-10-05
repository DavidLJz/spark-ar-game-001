export const Diagnostics = require('Diagnostics');
export const FaceTracking = require('FaceTracking');
export const Scene = require('Scene');
const Reactive = require('Reactive');
const Time = require('Time');

const PlayerInterface = class {
	constructor (sprite) {
		this.sprite = sprite;
		this.subscriptions = {};
		this.active = false;
	}

	getBounds2d() {
		return this.sprite.bounds;
	}

	isActive() {
		return this.active;
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
	}

	isActive() {
		return this.active;
	}

	activate() {
		this.sprite.hidden = false;
		this.active = true;
		return this;
	}

	moveVertically(y) {
		this.sprite.transform.y = y;
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

export const GameState = class {
	constructor(face, playerSprite, enemyCanvas) {
		this.face = face;
		this.player = new PlayerInterface(playerSprite);

		this.enemies = [];
		this.enemyCanvas = enemyCanvas;

	  this.faceTracking = null;
	  this.collisionWatch = [];

		this.state = 'idle'; // paused, over, started
	}

	start() {
		this.state = 'started';
		this.setEnemySpawner().enablePlayerMovement();

		return this;
	}

	end() {
		this.player.unsubscribeTo();
		this.faceTracking.unsubscribe();
			
		for ( const event in this.collisionWatch ) {
			event.unsubscribe();
		}

		this.collisionWatch = [];

		this.state = 'over';

		return this;
	}

	lose() {
		Diagnostics.log('Game over');

		return this;
	}

	setEnemySpawner() {
		(async () => {
			Time.setInterval(async () => {
				if ( this.enemies.length >= 2 ) return;

				let rand = Math.floor(Math.random() * (99 - 1)) + 1;

				const enemySprite = await Scene.create("PlanarImage", {
	        "name": `enemy-` + rand,
	        "width": 10000 * 20,
	        "height": 10000 * 20,
	        "hidden": false,
	        'material' : 'material1'
	      });

	      const enemy = new EnemyInterface(enemySprite);

	      this.enemies.push(enemy);
	      this.enemyCanvas.addChild(enemySprite);

				this.monitorCollision(enemy, () => { Diagnostics.log('collision detected') });

	      enemy.activate();

			}, 3000);

			Diagnostics.log('enemies spawning');
		})();

		return this;
	}

	enablePlayerMovement() {
		(async () => {
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
		})();

		return this;
	}

	monitorCollision(entity, onCollision) {
		(async () => {
			if ( typeof onCollision !== 'function' ) return;

      const col = CollisionDetector.checkCollision2d(
				entity.getBounds2d(), this.player.getBounds2d()
			);

			const collisionSignal = col.onOn().subscribe(onCollision);

			this.collisionWatch.push(collisionSignal);
		})();

		return this;
	}
};