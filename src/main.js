import { createGameConfig } from "./config/gameConfig.js";

const game = new Phaser.Game(createGameConfig());

window.nekoNoodleHouse = game;
