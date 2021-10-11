import { Reactive, Animation } from './Modules.js';

import { BaseEntity } from './BaseEntity.js';

export const EnemyEntity = class extends BaseEntity  {
	constructor (sprite, deviceWidth, deviceHeight) {
		super(sprite, deviceWidth, deviceHeight);
	}

	startMovement() {
		(async () => {
			this.animation = Animation.timeDriver({
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
					if ( !this.active ) return;

					const xSampler = Animation.samplers.linear(
						x.pinLastValue(), e.newValue
					);

					this.sprite.transform.x = Animation.animate(this.animation, xSampler);
				}
			);

			this.sprite.transform.y = Animation.animate(this.animation, ySampler);

			this.animation.start();

			this.animation.onCompleted().subscribe(() => {
				if ( this.active ) {
					this.animation.stop();
					this.startMovement();
				}
			});
		})();

		return this;
	}
};