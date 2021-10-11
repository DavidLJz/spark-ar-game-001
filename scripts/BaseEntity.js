import { Reactive, Scene, Animation } from './Modules.js';

export const BaseEntity = class {
	constructor(sprite, deviceWidth, deviceHeight) {
		this.sprite = sprite;

		this.deviceWidth = deviceWidth;
		this.deviceHeight = deviceHeight;

		this.subscriptions = {};
		this.active = false;
		this.animation = null;
	}

	activate() {
		this.active = true;
		this.animation = null;
		
		if ( 'startMovement' in this )	{
			this.startMovement();
		}

		this.sprite.hidden = Reactive.val(false);

		return this;
	}

	deactivate() {
		this.active = false;
		
		if ( this.animation && this.animation.isRunning() ) {
			this.animation.stop();
		}
		
		this.animation = null;

		this.sprite.hidden = Reactive.val(true);

		return this;
	}

	isActive() {
		return this.active;
	}

	unfreeze() {
		this.active = true;

		if ( this.animation ) {
			this.animation.start();
		}

		return this;
	}

	freeze() {
		this.active = false;

		if ( this.animation && this.animation.isRunning() ) {
			this.animation.stop();
		}

		return this;
	}

	destroy() {
		this.sprite.removeFromParent();
		Scene.destroy(this.sprite);
	}

	getBounds2d() {
		return this.sprite.bounds;
	}
}