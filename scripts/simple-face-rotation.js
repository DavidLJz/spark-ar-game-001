import { PlayerInterface, EnemyInterface } from './Interfaces.js'

const FaceTracking = require('FaceTracking');
const Scene = require('Scene');
const Reactive = require('Reactive');
const Time = require('Time');
const D = require('Diagnostics');

D.log('script loaded');

const cubicMap = (x) => {
  const A = 0.65;
  const C = 1/A - A*A;

  return C*x + x*x*x;
};

(async function () {

  const [face, playerSprite, enemyCanvas] = await Promise.all([
    FaceTracking.face(0),
    Scene.root.findFirst('rectangle0'),
    Scene.root.findFirst('canvas1'),
  ]);

  const Player = new PlayerInterface(playerSprite);

  const Enemies = [];

  for (let i = 0; i < 3; i++) {
    const dynamicPlane = await Scene.create("PlanarImage", {
        "name": `enemy${i}`,
        "width": 0.1,
        "height": 0.1,
        "hidden": true,
        'material' : 'material1'
    });

    Enemies.push( new EnemyInterface(dynamicPlane) );
  }

  const faceTurning = face.cameraTransform.rotationY;

  faceTurning.monitor().subscribeWithSnapshot(
    { val : faceTurning }, 
    (event, snapshot) => {
      let turnRadius = cubicMap(snapshot.val);
      let spriteHorizontalPosition = 275 * (1 + turnRadius) / 2;
  
      Player.moveHorizontally(spriteHorizontalPosition);
    } 
  );

})();