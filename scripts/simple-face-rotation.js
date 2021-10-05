import { Diagnostics, Scene, FaceTracking, GameState } from './Interfaces.js'

Diagnostics.log('script loaded');

(async function () {

  const [face, playerSprite, enemyCanvas] = await Promise.all([
    FaceTracking.face(0),
    Scene.root.findFirst('rectangle0'),
    Scene.root.findFirst('canvas1'),
  ]);

  const Game = new GameState(face, playerSprite, enemyCanvas);

  Game.start();

})();