export const PlayerInterface = class {
	constructor (sprite) {
		this.sprite = sprite;
		this.subscriptions = {};
	}

	moveHorizontally(x) {
		this.sprite.transform.x = x;
		return this;
	}

	getBounds2d() {
		return this.sprite.bounds;
	}

	unsuscribe(boundProperties) {
		if ( boundProperties && !Array.isArray(boundProperties) ) {
			throw new Error('must be array');
		}

		if ( !boundProperties ) {
			boundProperties = this.subscriptions;
		}

		for ( const i in boundProperties ) {
			this.subscriptions[i].unsubscribe();
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