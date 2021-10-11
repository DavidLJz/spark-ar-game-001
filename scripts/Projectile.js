import { Diagnostics, Reactive, Animation } from './Modules.js';

import { BaseEntity } from './BaseEntity.js';

export const ProjectileEntity = class extends BaseEntity {
	constructor (sprite, deviceWidth, deviceHeight, params) {
		super(sprite, deviceWidth, deviceHeight);

		if ( !params ) {
			throw new Error('must specify projectile params');
		}

		if ( !params.origin || !params.destination ) {
			throw new Error('Projectile must have origin and destination');
		}

		for ( const k of ['origin', 'destination'] ) {
			for ( const kk of ['x','y'] ) {
				const type = typeof params[k][kk];

				if ( type === 'undefined' ) {
					throw new Error(`projectile.${k} must have ${kk} value`);
				}

				if ( type === 'number' ) {
					params[k][kk] = Reactive.val(params[k][kk]);
				}
			}
		}

		const defaultParams = { 
			speed : 1000, accuracy : 100
		};

		this.params = { ...defaultParams, ...params };
	}

	startMovement() {
		let offset = 0;
		let destinationX = this.params.destination.x.pinLastValue();

		if ( this.params.accuracy >= 1 && this.params.accuracy < 100 ) { 
			let rand = Math.random();
			let min = 50 - (this.params.accuracy / 2);

			offset = Math.floor(rand * (50 - min)) + min;

			if ( rand <= 0.5 ) {
				destinationX += offset;
			} else {
				destinationX -= offset;
			}
		}

		this.animation = Animation.timeDriver({
			durationMilliseconds: this.params.speed,
		});
		
		const ySampler = Animation.samplers.linear(
			this.params.origin.y.pinLastValue(), 
			this.params.destination.y.pinLastValue()
		);

		const xSampler = Animation.samplers.linear(
			this.params.origin.x.pinLastValue(), destinationX
		);

		this.sprite.transform.y = Animation.animate(this.animation, ySampler);
		this.sprite.transform.x = Animation.animate(this.animation, xSampler);

		this.animation.start();

		return this;
	}
}