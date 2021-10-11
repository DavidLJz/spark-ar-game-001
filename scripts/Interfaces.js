import {
	Diagnostics, FaceTracking, Scene, Reactive, Time
} from './Modules.js';

import { PlayerEntity } from './Player.js';
import { EnemyEntity } from './Enemy.js';
import { ProjectileEntity } from './Projectile.js';

const cubicMap = (x) => {
  const A = 0.65;
  const C = 1/A - A*A;

  return C*x + x*x*x;
};

const CollisionDetector = {
	checkCollision : function (positionA, positionB, lengthA, lengthB) {
    return Reactive.abs(
    	positionA.sub(positionB)
    ).le(
    	Reactive.add(lengthA.div(2), lengthB.div(2))
    );
	},

	checkCollision2d : function (ObjectA, ObjectB) {
		return Reactive.andList([
			this.checkCollision(ObjectA.x, ObjectB.x, ObjectA.width, ObjectB.width),
			this.checkCollision(ObjectA.y, ObjectB.y, ObjectA.height, ObjectB.height),
		]);
	}
};

const BaseEntitiesInterface = class {
	constructor(entities=[]) {
		this.entities = entities;
	}

	callbackOnEntities(callback) {
		if ( typeof callback !== 'function' ) {
			throw new Error('callback must be a function');
		}

		for ( let i in this.entities ) {
			callback(this.entities[i], i);
		}

		return this;
	}

	activateAll() {
		return this.callbackOnEntities((entity, i) => {
			if ( entity.isActive() ) return;

			entity.activate();
		});
	}

	deactivateAll() {
		return this.callbackOnEntities((entity, i) => {
			if ( !entity.isActive() ) return;

			entity.deactivate();
		});
	}

	freezeAll() {
		return this.callbackOnEntities((entity, i) => {
			if ( !entity.isActive() ) return;

			entity.freeze();
		});
	}

	unfreezeAll() {
		return this.callbackOnEntities((entity, i) => {
			if ( entity.isActive() ) return;

			entity.unfreeze();
		});
	}
}

const 

const ProjectileInterface = class extends BaseEntitiesInterface {
	constructor(canvas, deviceWidth, deviceHeight, materials) {
		super();

		this.canvas = canvas;
		this.deviceWidth = deviceWidth;
		this.deviceHeight = deviceHeight;
		this.materials = materials;
	}

	shoot(shooter, burst, material, accuracy=100) {
		const bounds = shooter.getBounds2d();

		if ( typeof burst !== 'number' || burst <= 1 || burst >= 5 ) {
			burst = 1;
		}

		const sub = bounds.x.monitor().subscribeWithSnapshot(
			{ 'x' : bounds.x, 'y' : bounds.y }, 
			(e, snapshot) => {
				sub.unsubscribe();

				const projParams = {
					origin : { 
						'x' : snapshot.x, 'y' : snapshot.y 
					},

					destination : {
						'x' : snapshot.x, 'y' : -10
					},

					accuracy
				};

				for (let i = 0; i <= burst-1; i++) {
					if (!i) {
						this.createProjectile(material, projParams);
						continue;
					}

					Time.setTimeout(
						() => { this.createProjectile(material, projParams); }, 
						150 * i
					);
				}
			}
		);
	}

	shootWhile(condition, shooter, burst, material, accuracy=100) {
		const shooting = Time.setInterval(
			() => { this.shoot(shooter, burst, material, accuracy) }, 150
		);

		condition.onOff({ fireOnInitialValue: true }).subscribe(
			(e) => { Time.clearInterval(shooting); }
		);

		return this;
	}

	shootLaser(shooter, burst=1) {
		this.shoot(shooter, burst, this.materials.laser, 85);

		return this;
	}

	async createProjectile(material, params) {
		let rand = Math.floor(Math.random() * (99 - 1)) + 1;

		const sprite = await Scene.create("PlanarImage", {
      "name": `projectile-` + rand,
      "width": 10000 * 8,
      "height": 10000 * 8,
      "hidden": true,
      'material' : material
    });

    this.canvas.addChild(sprite);

		const projectile = new ProjectileEntity(
			sprite, this.deviceWidth, this.deviceHeight, params
		);

		const len = this.entities.push(projectile);

		projectile.activate();

		projectile.animation.onCompleted().subscribe(() => {
			if ( !projectile.isActive() ) return;

			projectile.destroy();
			this.entities.splice(len - 1, 1);
		});
	}
};

export const GameInterface = class {
	constructor(
		face, deviceSize, playerSprite, entityMaterials,  
		canvas, gameStateText, playerStateText, timeText
	) {
		this.face = face;

		this.deviceSize = deviceSize;

		this.entityMaterials = entityMaterials;

		this.player = new PlayerEntity(
			playerSprite, deviceSize.x, deviceSize.y
		);

		this.projectiles = new ProjectileInterface(
			canvas, deviceSize.x, deviceSize.y, entityMaterials.projectiles
		);

		this.entities = { enemies : [] };

		this.canvas = canvas;

	  this.faceTracking = null;
	  this.collisionWatch = [];
	  this.enemyMovementWatch = [];

	  this.gameTime = Reactive.val(0);
	  this.gameTimeWatch = null;

	  this.timeText = timeText;
	  this.timeText.hidden = Reactive.val(true);;

	  this.gameStateText = gameStateText;
	  this.gameStateText.hidden = Reactive.val(true);;

	  this.playerStateText = playerStateText;
	  this.playerStateText.hidden = Reactive.val(true);;

		this.state = 'idle'; // paused, over, started
	}

	start() {
		(async () => {
			this.state = 'started';

		  this.gameStateText.hidden = Reactive.val(true);;
		  this.gameStateText.text = '';

		  this.timeText.hidden = Reactive.val(true);;
		  this.timeText.text = '';

		  this.gameTime = Reactive.val(0);

		  this.logGameTime();

			this.monitorPlayerLife().enablePlayerMovement().setEnemySpawner();
		})();

		return this;
	}

	end() {
		(async () => {
			this.state = 'over';

			this.faceTracking.unsubscribe();

			for ( const i in this.entities ) {
				for ( const entity of this.entities[i] ) {	
					entity.deactivate();
				}
			}

			(async () => {
				this.projectiles.deactivateAll();
			})();
				
			for ( const event of this.collisionWatch ) {
				event.unsubscribe();
			}
				
			for ( const event of this.enemyMovementWatch ) {
				event.unsubscribe();
			}

			this.collisionWatch = [];
			this.enemyMovementWatch = [];

		  Time.clearInterval(this.gameTimeWatch);
		})();

		return this;
	}

	lose() {
		Diagnostics.log('Game over');

		this.gameStateText.text = 'GAME OVER';
		this.gameStateText.hidden = Reactive.val(false);

	  this.playerStateText.hidden = Reactive.val(true);;
	  this.playerStateText.text = '';

		this.end();

		return this;
	}

	resume() {
		this.state = 'started';
		this.enablePlayerMovement();

		this.gameStateText.hidden = Reactive.val(true);

		for ( const i in this.entities ) {
			(async () => {
				for ( const entity of this.entities[i] ) {	
					if ( entity.isActive() ) continue;

					entity.unfreeze();
				}
			})();
		}

		(async () => {
			this.projectiles.unfreezeAll();
		})();

		this.logGameTime(true);
	}

	pause() {
		this.state = 'paused';
		this.disablePlayerMovement();

		this.gameStateText.text = 'PAUSED';
		this.gameStateText.hidden = Reactive.val(false);

		for ( const i in this.entities ) {
			(async () => {
				for ( const entity of this.entities[i] ) {	
					if ( !entity.isActive() ) continue;

					entity.freeze();
				}
			})();
		}

		(async () => {
			this.projectiles.freezeAll();
		})();

		Time.clearInterval(this.gameTimeWatch);

		return this;
	}

	logGameTime(resume=false) {
		this.timeText.hidden = Reactive.val(false);

		this.gameTimeWatch = Time.setInterval(async time => {
			// seconds since setInterval first started
			const t = Reactive.div( time, Reactive.val(1000) ).round();
			
			// if resume add to gameTime value, else set
			this.gameTime = resume ? this.gameTime.add(t) : t;

			const m = this.gameTime.div(60);
			const s = this.gameTime.mod(60);

			this.timeText.text = m.ge(1).ifThenElse(
				// 1m 30s
				m.round().toString().concat('m ').concat(
					s.ge(1).ifThenElse(
						s.round().toString().concat('s'), ''
					)
				),

				// 30s
				this.gameTime.toString().concat('s')
			);
		}, 1000);
	}

	monitorPlayerLife() {
		(async () => {
			this.player.activate();
	  
	  	this.playerStateText.text = 'LIFES: ' + this.player.lifes;
	  	this.playerStateText.hidden = Reactive.val(false);

			this.player.onDeath(() => {
				Diagnostics.log('player is dead');

				this.lose();
			});
		})();

		return this;
	}

	setEnemySpawner() {
		(async () => {
			this.generateEnemy();

			Diagnostics.log('enemies spawning');
		})();

		return this;
	}

	generateEnemy() {
		(async () => {
			if ( this.entities.enemies.length >= 3 ) {
				for ( const enemy of this.entities.enemies ) {
					if ( enemy.isActive() ) continue;

					enemy.activate();
					return;
				}

				return;
			}

			let rand = Math.floor(Math.random() * (20 - 13)) + 13;

			const material = this.entityMaterials.meteors[
				(Math.random() * this.entityMaterials.meteors.length) | 0
			];

			const enemySprite = await Scene.create("PlanarImage", {
	      "name": `enemy-` + this.entities.enemies.length,
	      "width": 10000 * rand,
	      "height": 10000 * rand,
	      "hidden": false,
	      'material' : material
	    });

	    const enemy = new EnemyEntity(
	    	enemySprite, this.deviceSize.x, this.deviceSize.y
	    );

	    this.entities.enemies.push(enemy);
	    this.canvas.addChild(enemySprite);

			this.monitorCollision(enemy, this.player, () => {
				Diagnostics.log('collision detected');

				this.player.damage();
				this.playerStateText.text = 'LIFES: ' + this.player.lifes;
			});

			enemy.getBounds2d().y.ge(400).onOn().subscribe(() => {
				if ( this.state == 'started' && this.entities.enemies.length < 3 ) {	
					this.generateEnemy();
				}
			});

	    enemy.activate();
		})();

	  return this;
	}

	enablePlayerMovement() {
		const faceTurning = this.face.cameraTransform.rotationY;		  

		this.faceTracking = faceTurning.monitor().subscribeWithSnapshot(
	    { faceTurning }, 
	    (event, snapshot) => {
	      let turnRadius = cubicMap(snapshot.faceTurning);
	      let spriteHorizontalPosition = 275 * (1 + turnRadius) / 2;
	  
	      this.player.moveHorizontally(spriteHorizontalPosition);
	    } 
	  );

	  Diagnostics.log('enabled player controls');

		return this;
	}

	disablePlayerMovement() {
		if ( !this.faceTracking ) return;

		this.faceTracking.unsubscribe();

		Diagnostics.log('disabled player controls');

		return this;
	}

	monitorCollision(entityA, entityB, onCollision) {
		(async () => {
			if ( typeof onCollision !== 'function' ) return;

      const col = CollisionDetector.checkCollision2d(
				entityA.getBounds2d(), entityB.getBounds2d()
			);

			this.collisionWatch.push(
				col.onOn().subscribe(onCollision)
			);
		})();

		return this;
	}

	shoot(burst=1) {
		this.projectiles.shootLaser(this.player, burst);

		return this;
	}
};