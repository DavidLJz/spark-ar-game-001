export const PlayerInterface = class {
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

	onChangeHorizontalPosition(callback) {
		if ( !callback || typeof callback !== 'function' ) {
			throw new Error('must be callback');
		}

		const bound = this.sprite.bounds.x;

		this.subscriptions['x'] = bound.monitor().subscribeWithSnapshot(
			{ val : this.sprite.bounds.x },
			(event, snapshot) => { callback(snapshot.val) }
		);

		return this;
	}
};

export const EnemyInterface = class {
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

export const CollisionDetector = {

	getCollisionArea : function (obj) {
		const bounds = obj.getBounds2d();

		let x = bounds.x.pinLastValue();
		let y = bounds.y.pinLastValue();
	
		let h = bounds.height.pinLastValue();
		let w = bounds.width.pinLastValue();

		return {
			'x' : { 'min': x, 'max': x + w },
			'y' : { 'min': y, 'max': y + h }
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

		D.log(collisionAreas);

		for ( let k in collisionAreas ) {
			const objA = collisionAreas[k];

			for ( let i in collisionAreas ) {
				if ( i === k ) continue;

				const objB = collisionAreas[i];

				let collided = this.detectCollision(objA, objB)
				
				if ( collided ) {
 					collisions.push([ k, i ]);
				}
			}
		}

		return collisions;
	},

	detectCollision : function (objA, ojbB) {
		let x = this.axisCollisions('x', objA, ojbB);
		let y = this.axisCollisions('y', objA, ojbB);

		if ( x > 0 && y > 0 ) {
			return true;
		}

		return false;
	},

	axisCollisions : function (xy, objA, ojbB) {
		if ( typeof xy !== 'string' || ['x','y'].indexOf(xy) == -1 ) {
			throw new Error('invalid argument xy must be string x or y')
		}

		let count = 0;

		if ( objA[xy].min >= ojbB[xy].min && objA[xy].min <= ojbB[xy].max ) {
			count++;
		}

		if ( objA[xy].max >= ojbB[xy].min && objA[xy].max <= ojbB[xy].max ) {
			count++;
		}

		return count;
	}
};
