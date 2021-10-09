import { 
  Reactive, TouchGestures, Diagnostics, Scene, FaceTracking 
} from './Modules.js';

import { GameInterface } from './Interfaces.js';

Diagnostics.log('script loaded');

(async function () {

  const [
    face, worldCanvas, gameStateText, playerStateText, timeText
  ] = await Promise.all([
    FaceTracking.face(0),
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
      material : 'material1'
  });

  worldCanvas.addChild(playerSprite);

  const Game = new GameInterface(
    face, playerSprite, worldCanvas, gameStateText, playerStateText, timeText
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