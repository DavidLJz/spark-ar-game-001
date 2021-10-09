import { 
  Reactive, TouchGestures, Diagnostics, Scene, FaceTracking 
} from './Modules.js';

import { GameInterface } from './Interfaces.js';

Diagnostics.log('script loaded');

(async function () {

  const [
    face, playerSprite, enemyCanvas, gameStateText, playerStateText, timeText
  ] = await Promise.all([
    FaceTracking.face(0),
    Scene.root.findFirst('rectangle0'),
    Scene.root.findFirst('canvas1'),
    Scene.root.findFirst('2dText0'),
    Scene.root.findFirst('2dText1'),
    Scene.root.findFirst('2dText2'),
  ]);

  const Game = new GameInterface(
    face, playerSprite, enemyCanvas, gameStateText, playerStateText, timeText
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