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

  getCollisionArea : function (obj) {
    const bounds = obj.getBounds2d();

    return {
      'x': { 'min' : bounds.x.pin(), 'max' : bounds.x.add( bounds.width.pin() ) },
      'y': { 'min' : bounds.y.pin(), 'max' : bounds.y.pin( bounds.height.pin() ) },
    };
  },

  getCollisions : function (objArray) {
    if ( !objArray || !Array.isArray(objArray) ) {
      throw new Error('must pass an array');
    }

    if ( objArray.length < 2 ) {
      throw new Error('need more objects to check');
    }

    const collisionAreas = [];
    const collisions = [];

    for ( let i in objArray ) {
      const colArea = this.getCollisionArea(objArray[i]);

      collisionAreas.push(colArea);
    }

    for ( let k in collisionAreas ) {
      const objA = collisionAreas[k];

      for ( let i in collisionAreas ) {
        if ( i === k ) continue;

        const objB = collisionAreas[i];

        let x = this.axisCollisions('x', objA, objB);
        let y = this.axisCollisions('y', objA, objB);

        const event1 = new EventSource({
          subscribe : function () {
            collisions.push([ k, i ])
          }
        });

        const event2 = new EventSource;

        x.and( y ).ifThenElse(event1, event2);

        event1.unsubscribe();
      }
    }

    return collisions;
  },

  axisCollisions : function (xy, objA, objB) {
    if ( typeof xy !== 'string' || ['x','y'].indexOf(xy) == -1 ) {
      throw new Error('invalid argument xy must be string x or y')
    }

    let axisCollisionA = objA[xy].min.ge( objB[xy].min ).and( 
      objA[xy].min.le( objB[xy].max ) 
    ).pin();

    let axisCollisionB = objA[xy].max.ge( objB[xy].min ).and( 
      objA[xy].max.le( objB[xy].max ) 
    ).pin();

    return axisCollisionA.and( axisCollisionB ).ifThenElse(true, false);
  }
};

export const GameState = class {
	constructor(face, playerSprite, enemyCanvas) {
		this.face = face;
		this.player = new PlayerInterface(playerSprite);

		this.enemies = [];
		this.enemyCanvas = enemyCanvas;

	  this.faceTracking = null;
		this.state = 'idle'; // paused, over, started
	}

	start() {
		(async () => {
			this.state = 'started';

			if ( !this.enemies.length ) {
			  for (let i = 0; i < 3; i++) {
			    const dynamicPlane = await Scene.create("PlanarImage", {
			        "name": `enemy${i}`,
			        "width": 10000 * 20,
			        "height": 10000 * 20,
			        "hidden": true,
			        'material' : 'material1'
			    });

			    const enemy = new EnemyInterface(dynamicPlane);

			    this.enemies.push(enemy);
			    this.enemyCanvas.addChild(dynamicPlane);
			  }
			}

			this.enableGameplay();
		})();

		return this;
	}

	end() {
		this.player.unsubscribeTo();
		this.faceTracking.unsubscribe();

		this.state = 'over';

		return this;
	}

	enableGameplay() {
		const faceTurning = this.face.cameraTransform.rotationY;

	  this.faceTracking = faceTurning.monitor().subscribeWithSnapshot(
	    { faceTurning }, 
	    (event, snapshot) => {
	      let turnRadius = cubicMap(snapshot.faceTurning);
	      let spriteHorizontalPosition = 275 * (1 + turnRadius) / 2;
	  
	      this.player.moveHorizontally(spriteHorizontalPosition);
	    } 
	  );

	  let addToSnapshot = {};

	  for ( let i in this.enemies ) {
	  	addToSnapshot['enemy-'+ i +'-x'] = this.enemies[i].getBounds2d().x;
	  	addToSnapshot['enemy-'+ i +'-y'] = this.enemies[i].getBounds2d().y;
	  	addToSnapshot['enemy-'+ i +'-w'] = this.enemies[i].getBounds2d().width;
	  	addToSnapshot['enemy-'+ i +'-h'] = this.enemies[i].getBounds2d().height;
	  }

	  this.player.onChangeHorizontalPosition(function (snapshot) {
	  	
	  	Diagnostics.log(snapshot);

	  }, addToSnapshot);

	  return this;
	}
};