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

		const defaultParams = { speed : 1000 };

		this.params = { ...defaultParams, ...params };
	}

	startMovement() {
		(async () => {
			this.timeDriver = Animation.timeDriver({
				durationMilliseconds: this.params.speed,
			});
			
			const ySampler = Animation.samplers.linear(
				this.params.origin.y.pinLastValue(), 
				this.params.destination.y.pinLastValue()
			);

			const xSampler = Animation.samplers.linear(
				this.params.origin.x.pinLastValue(), 
				this.params.destination.x.pinLastValue()
			);

			this.sprite.transform.y = Animation.animate(this.timeDriver, ySampler);
			this.sprite.transform.x = Animation.animate(this.timeDriver, xSampler);

			this.timeDriver.start();

			this.timeDriver.onCompleted().subscribe(() => {
				if ( this.active ) {
					this.timeDriver.stop();
					this.deactivate();
				}
			});

		})();

		return this;
	}
}