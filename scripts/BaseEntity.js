import { Reactive, Animation } from './Modules.js';

export const BaseEntity = class {
	constructor(sprite, deviceWidth, deviceHeight) {
		this.sprite = sprite;

		this.deviceWidth = deviceWidth;
		this.deviceHeight = deviceHeight;

		this.subscriptions = {};
		this.active = false;
		this.timeDriver = null;
	}

	activate() {
		this.active = true;
		this.timeDriver = null;
		
		if ( 'startMovement' in this )	{
			this.startMovement();
		}

		this.sprite.hidden = Reactive.val(false);

		return this;
	}

	deactivate() {
		this.active = false;
		
		if ( this.timeDriver && this.timeDriver.isRunning() ) {
			this.timeDriver.stop();
		}
		
		this.timeDriver = null;

		this.sprite.hidden = Reactive.val(true);

		return this;
	}

	isActive() {
		return this.active;
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

	getBounds2d() {
		return this.sprite.bounds;
	}
}