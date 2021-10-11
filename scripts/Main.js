import { 
  Reactive, Materials, TouchGestures, Diagnostics, Scene, FaceTracking, Patches 
} from './Modules.js';

import { GameInterface } from './Interfaces.js';

Diagnostics.log('script loaded');

(async function () {

  const [
    face, 
    deviceSize,
    worldCanvas, 
    gameStateText, 
    playerStateText,
    timeText
  ] = await Promise.all([
    FaceTracking.face(0),
    Patches.outputs.getPoint2D('deviceSize'),
    Scene.root.findFirst('worldCanvas'),
    Scene.root.findFirst('gameStateText'),
    Scene.root.findFirst('playerStateText'),
    Scene.root.findFirst('timeText'),
  ]);

  // materials
  const [
    playerSpriteMaterial, 
    meteorGreyBig1, 
    meteorGreyBig2, 
    projectileLaserRed
  ] = await Promise.all([
    Materials.findFirst('playerSpriteMaterial'),
    Materials.findFirst('meteorGreyBig1'),
    Materials.findFirst('meteorGreyBig2'),
    Materials.findFirst('projectileLaserRed'),
  ]);

  const playerSprite = await Scene.create('PlanarImage', {
      name : 'playerSprite',
      hidden : false,
      width : 10000 * 15,
      height : 10000 * 15,
      material : playerSpriteMaterial
  });

  worldCanvas.addChild(playerSprite);

  const entityMaterials = {
    enemies : { 
      meteors : [meteorGreyBig1, meteorGreyBig2]
    },
    
    projectiles : { laser : projectileLaserRed }
  };

  const Game = new GameInterface(
    face, deviceSize, playerSprite, entityMaterials, 
    worldCanvas, gameStateText, playerStateText, timeText
  );

  FaceTracking.count.eq(0).onOn().subscribe(
    () => {
      if ( Game.state === 'started' ) {
        Game.pause();
      }
    }
  );

  TouchGestures.onTap().subscribe(() => {
    switch ( Game.state ) {
      case 'idle': {
        Game.start();
        break;
      }

      case 'over': {
        Game.start();
        break;
      }

      case 'started': {
        Game.shoot(3);
        break;
      }
    
      case 'paused': {
        Game.resume();
        break;
      }

      default: break;
    }
  });

})();