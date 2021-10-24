- [ ] fix projectiles not disspearing when game is over

- [ ] add player collision effect
  - [x] add animation
  - [ ] add sfx

- [ ] add projectile - enemy collision effect

- [ ] fix enemies stop spawning when shooting them
  - [ ] condition enemy spawner to only spawn when game is active
    - [ ] add a spawners property to EnemyInterface
      - [ ] add a "turn off spawner" method to EnemyInterface
        - [ ] On game start enable meteor spawner, on pause/end disable meteor spawner

- [ ] add onDestroy method to Enemy entity

- [ ] Addd support for multiple entity types to BaseEntitiesInterface

- [x] add enemy - projectile collision
  - [x] add onCreate callback argument to ProjectileInterface::shoot
    - [x] add collision check to enemies active and on screen
      - [x] on collision with enemy trigger console output 