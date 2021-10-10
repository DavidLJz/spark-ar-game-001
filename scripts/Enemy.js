import { Reactive, Animation } from './Modules.js';

export const EnemyEntity = class {
	constructor (sprite, deviceWidth, deviceHeight) {
		this.sprite = sprite;

		this.deviceWidth = deviceWidth;
		this.deviceHeight = deviceHeight;

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
		this.timeDriver = null;

		this.beginMovement(x);

		this.sprite.hidden = Reactive.val(false);

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
		this.sprite.hidden = Reactive.val(true);

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
		(async () => {
			this.timeDriver = Animation.timeDriver({
				durationMilliseconds: 3500,
			});
			
			const ySampler = Animation.samplers.linear(
				-100, this.deviceHeight.pinLastValue()
			);

			let rand = Reactive.val( Math.random() );
			const x = this.deviceWidth.sub(20).mul(rand).floor().add(20);

			rand = Math.floor(Math.random() * (100 - 10)) + 10;
			const inLeftHalf = x.lt( this.deviceWidth.div(2) );

			const randSum = Reactive.ifThenElse(
				inLeftHalf, x.add(rand), x.sub(rand)
			);

			// ifThenElse takes too long
			randSum.monitor({fireOnInitialValue:true}).subscribe(
				(e) => {
					const xSampler = Animation.samplers.linear(
						x.pinLastValue(), e.newValue
					);

					this.sprite.transform.x = Animation.animate(this.timeDriver, xSampler);
				}
			);

			this.sprite.transform.y = Animation.animate(this.timeDriver, ySampler);

			this.timeDriver.start();

			this.timeDriver.onCompleted().subscribe(() => {
				if ( this.active ) {
					this.timeDriver.stop();
					this.startMovement();
				}
			});
		})();

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