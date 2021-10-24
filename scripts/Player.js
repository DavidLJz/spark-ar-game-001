import { Diagnostics, Reactive, Animation, Time } from "./Modules";

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

		this.shake().shrink();

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

	changeColor(colorObj={}) {
		let keycount = 0;

		for ( const key of ['r','g','b'] ) {
			if ( typeof colorObj[key] === 'number' ) {
				if ( colorObj[key] > 255 ) {
					throw new Error(`value ${key} cannot be higher than 255`);
				}

				if ( colorObj[key] < 0 ) {
					throw new Error(`value ${key} cannot be lower than 0`);
				}

				colorObj[key] /= 255;

				keycount++;

			} else {
				colorObj[key] = 0;
			}
		}

		if ( !keycount ) {
			throw new Error('must pass color object');
		}

		const rgb_signal = Reactive.RGBA(
			colorObj.r, colorObj.g, colorObj.b
		);

		this.sprite.getMaterial().then(async (material) => {
		});

		return this;
	}

	colorRed() {
		return this.changeColor({ r : 255, g : 60, b : 10 });
	}
	
	colorWhite() {
		return this.changeColor({ r : 255, g : 255, b : 255 });
	}

	rotateAnimation(duration, begin, end, onComplete=null) {
		if ( onComplete && typeof onComplete !== 'function' ) {
			throw new Error('invalid arg typeof onComplete must be function');
		}

		const animation = Animation.timeDriver({
			durationMilliseconds: duration,
		});

		const z_rotation = this.sprite.bounds.rotationZ;
			
		const sampler = Animation.samplers.linear(begin, end);

		this.sprite.transform.rotationZ = Animation.animate(animation, sampler);

		animation.start();

		const sub_a = animation.onCompleted().subscribe(() => {
			sub_a.unsubscribe();
			onComplete(animation);
		});
	}

	sizeAnimation(duration, height=null, width=null, onComplete=null) {
		if ( !height && !width ) {
			throw new Error('Invalid args must state height or width');
		}

		const animation = Animation.timeDriver({
			durationMilliseconds: duration,
		});

		const currentHeight = this.sprite.height;
		const currentWidth = this.sprite.width;

		const heightSampler = Animation.samplers.linear(
			currentHeight.pinLastValue(), height
		);

		const widthSampler = Animation.samplers.linear(
			currentWidth.pinLastValue(), width
		);

		this.sprite.height = Animation.animate(animation, heightSampler);
		this.sprite.width = Animation.animate(animation, widthSampler);

		animation.start();

		const sub_a = animation.onCompleted().subscribe(() => {
			sub_a.unsubscribe();
			onComplete(animation);
		});
	}

	shake() {
		this.rotateAnimation(100, 0, 0.2, (animation) => {
			animation.reverse();
			animation.stop();

			this.rotateAnimation(100, 0, -0.2, (animation) => {
				animation.reverse();
				animation.stop();
			})
		});

		return this;
	}

	shrink() {
		const h = this.sprite.height.sub(20000).pinLastValue();
		const w = this.sprite.width.sub(20000).pinLastValue();

		this.sizeAnimation(200, h, w, (animation) => {
			animation.reverse();
			animation.stop();
		});

		return this;
	}
};