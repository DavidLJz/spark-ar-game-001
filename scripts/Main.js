import { 
  Reactive, Materials, TouchGestures, Diagnostics, Scene, FaceTracking, Patches 
} from './Modules.js';

import { GameInterface } from './Interfaces.js';

Diagnostics.log('script loaded');

(async function () {

  const [
    face, 
    deviceSize,
    playerSpriteMaterial, 
    meteorGreyBig1, 
    meteorGreyBig2, 
    worldCanvas, 
    gameStateText, 
    playerStateText,
    timeText
  ] = await Promise.all([
    FaceTracking.face(0),
    Patches.outputs.getPoint2D('deviceSize'),
    Materials.findFirst('playerSpriteMaterial'),
    Materials.findFirst('meteorGreyBig1'),
    Materials.findFirst('meteorGreyBig2'),
    Scene.root.findFirst('worldCanvas'),
    Scene.root.findFirst('gameStateText'),
    Scene.root.findFirst('playerStateText'),
    Scene.root.findFirst('timeText'),
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
    meteors : [ meteorGreyBig1, meteorGreyBig2 ]
  };

  const Game = new GameInterface(
    face, deviceSize, playerSprite, entityMaterials, 
    worldCanvas, gameStateText, playerStateText, timeText
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
        Game.pause();
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