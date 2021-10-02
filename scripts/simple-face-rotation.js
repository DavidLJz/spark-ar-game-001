const FaceTracking = require('FaceTracking');
const Scene = require('Scene');
const Reactive = require('Reactive');
const Time = require('Time');
const D = require('Diagnostics');
  
D.log('started');

const cubicMap = (x) => {
  //if (x >  0.65) return 1;
  //if (x < -0.65) return -1;

  const A = 0.65;
  const C = 1/A - A*A;

  return C*x + x*x*x;
}

(async function () {

  const [face, playerSprite] = await Promise.all([
    FaceTracking.face(0),
    Scene.root.findFirst('rectangle0')
  ]);

  let spriteHorizontalPosition = 0;
  let turnRadius = 0;

  const faceTurning = face.cameraTransform.rotationY;

  faceTurning.monitor().subscribeWithSnapshot(
    { val : faceTurning }, 
    (event, snapshot) => { 
      //turnRadius = snapshot.val;

      turnRadius = cubicMap(snapshot.val);
      spriteHorizontalPosition = 275 * (1 + turnRadius) / 2;

      //spriteHorizontalPosition = ((turnRadius * -1) + 1) * 137.5;
    
      playerSprite.transform.x = spriteHorizontalPosition;
    } 
  );

  Time.setInterval(function () {
    D.log(spriteHorizontalPosition);
    D.log(turnRadius);
  }, 250);

})();