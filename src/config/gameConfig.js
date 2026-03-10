import { GameScene } from "../scenes/GameScene.js";

export function createGameConfig() {
  return {
    type: Phaser.AUTO,
    parent: "game-container",
    width: 800,
    height: 600,
    backgroundColor: "#dca66f",
    pixelArt: true,
    physics: {
      default: "arcade",
      arcade: {
        debug: false
      }
    },
    scene: [GameScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    }
  };
}
