export const PlayerEntity = class {
	constructor (sprite, deviceWidth, deviceHeight) {
		this.sprite = sprite;
		this.subscriptions = {};
		this.lifes = 3;
		this.onDeathCallback = null;

		this.deviceWidth = deviceWidth;
		this.deviceHeight = deviceHeight;

		this.sprite.transform.y = deviceHeight.sub(100);

		this.sprite.transform.x = deviceWidth.div(2).sub(
			this.sprite.bounds.width.div(2)
		);
	}

	freeze() {
		this.sprite.transform.y = this.sprite.transform.y.pinLastValue();
		this.sprite.transform.x = this.sprite.transform.x.pinLastValue();

		return this;
	}

	resetPosition() {
		this.sprite.transform.y = this.deviceHeight.sub(100);

		this.sprite.transform.x = this.deviceWidth.div(2).sub(
			this.sprite.bounds.width.div(2)
		);

		return this;
	}

	getBounds2d() {
		return this.sprite.bounds;
	}

	damage() {
		this.lifes--;

		if ( this.lifes === 0 && this.onDeathCallback ) {
			this.onDeathCallback();
			this.resetPosition();
		}

		return this;
	}

	activate() {
		this.lifes = 3;

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