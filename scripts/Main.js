import { Diagnostics, Scene, FaceTracking, GameState } from './Interfaces.js'

Diagnostics.log('script loaded');

(async function () {

  const [face, playerSprite, enemyCanvas, gameStateText] = await Promise.all([
    FaceTracking.face(0),
    Scene.root.findFirst('rectangle0'),
    Scene.root.findFirst('canvas1'),
    Scene.root.findFirst('2dText0'),
  ]);

  const Game = new GameState(face, playerSprite, enemyCanvas, gameStateText);

  Game.start();

})();