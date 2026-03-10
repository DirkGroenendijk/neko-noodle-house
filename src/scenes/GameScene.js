import {
  CUSTOMER_SPEED,
  CUSTOMER_VARIANTS,
  DAY_TIME_INCREMENT,
  DAY_LENGTH_SECONDS,
  INGREDIENTS,
  MAX_PATIENCE,
  MAX_TIP,
  PLAYER_SPEED,
  RECIPES,
  STATIONS,
  UPGRADE_DEFS
} from "../data/gameData.js";

const RECIPE_LIST = Object.values(RECIPES);
const UPGRADE_BY_KEY = Object.fromEntries(UPGRADE_DEFS.map((upgrade) => [upgrade.key, upgrade]));
const INGREDIENT_ORDER = ["noodles", "broth", "egg", "fishcake"];
const UPGRADE_BAR_WIDTH = 250;
const UPGRADE_ROW_STEP = 48;
const END_OVERLAY_LAYOUT = {
  panelX: 400,
  panelY: 280,
  titleY: 196,
  moneyY: 238,
  servedY: 272,
  mistakesY: 302,
  bankY: 330,
  headerY: 360,
  firstRowY: 390,
  nextDayButtonY: 492,
  hintY: 526
};
const UI_TEXT = {
  welcome: "Welcome to the noodle house.",
  intro: "Carry ingredients one at a time, build the bowl at assembly, then serve the order.",
  firstCustomer: "The first customer is on the way."
};
const ASSEMBLY_HIGHLIGHT_RECTS = {
  noodles: { x: -18, y: 0, width: 12, height: 6 },
  broth: { x: -4, y: 0, width: 12, height: 6 },
  egg: { x: 10, y: -1, width: 8, height: 8 },
  fishcake: { x: 10, y: 8, width: 8, height: 8 }
};

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  create() {
    this.dayNumber = 1;
    this.dayTimeLeft = DAY_LENGTH_SECONDS;
    this.bankMoney = 0;
    this.dayEarnings = 0;
    this.money = 0;
    this.customersServed = 0;
    this.mistakesMade = 0;
    this.currentCustomer = null;
    this.gameEnded = false;
    this.gameStarted = false;
    this.playerState = this.createEmptyPlayerState();
    this.assemblyState = this.createEmptyAssemblyState();
    this.upgrades = this.createUpgradeState();
    this.resetDayState();

    this.createTextures();
    this.createRoom();
    this.createStations();
    this.createAssemblyPreview();
    this.createCharacters();
    this.createInput();
    this.createUi();
    this.createStartOverlay();
    this.setGameplayVisibility(false);
    this.setMessage(UI_TEXT.welcome);
    this.updateUi();
  }

  update(_time, delta) {
    this.frameDelta = delta;

    if (!this.gameStarted) {
      this.handleStartInput();
      this.animatePlayer(delta, false);
      return;
    }

    if (this.gameEnded) {
      this.player.body.setVelocity(0, 0);
      this.handleUpgradeInput();
      this.animatePlayer(delta, false);
      this.updateUi();
      return;
    }

    this.updateDayTimer(delta);
    this.updatePlayerMovement();
    this.updateCustomer(delta);
    this.updateUi();
    this.handleInteraction();
  }

  createEmptyPlayerState() {
    return {
      holding: null
    };
  }

  createEmptyAssemblyState() {
    return {
      ingredients: []
    };
  }

  createUpgradeState() {
    return {
      movement: 0,
      patience: 0,
      tips: 0
    };
  }

  resetDayState() {
    this.dayTimeLeft = DAY_LENGTH_SECONDS + (this.dayNumber - 1) * DAY_TIME_INCREMENT;
    this.dayEarnings = 0;
    this.customersServed = 0;
    this.mistakesMade = 0;
    this.currentCustomer = null;
    this.gameEnded = false;
    this.playerState = this.createEmptyPlayerState();
    this.assemblyState = this.createEmptyAssemblyState();
  }

  getUpgradeDef(upgradeKey) {
    return UPGRADE_BY_KEY[upgradeKey];
  }

  createTextures() {
    if (this.textures.exists("cat")) {
      return;
    }

    this.makeCharacterTexture("cat", 0xd6a066, 0x4d3425, 0xffe6c9, "cat");

    Object.values(STATIONS).forEach((station) => {
      this.makeStationTexture(`station-${station.key}`, station.color, station.type);
    });

    Object.values(INGREDIENTS).forEach((ingredient) => {
      this.makeIngredientTexture(`ingredient-${ingredient.key}`, ingredient);
    });

    this.makeBowlTexture("bowl-empty", []);
    RECIPE_LIST.forEach((recipe) => {
      this.makeBowlTexture(`bowl-${recipe.key}`, recipe.ingredients);
    });
  }

  makeCharacterTexture(key, bodyColor, accentColor, faceColor, kind) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });

    graphics.fillStyle(bodyColor, 1);
    graphics.fillRect(6, 8, 20, 18);
    graphics.fillRect(10, 4, 12, 10);

    if (kind === "cat") {
      graphics.fillRect(8, 0, 4, 6);
      graphics.fillRect(20, 0, 4, 6);
      graphics.fillStyle(accentColor, 1);
      graphics.fillRect(3, 10, 4, 3);
      graphics.fillRect(26, 18, 4, 3);
      graphics.fillRect(28, 7, 2, 10);
    } else {
      graphics.fillRect(9, 1, 3, 3);
      graphics.fillRect(20, 1, 3, 3);
      graphics.fillStyle(accentColor, 1);
      graphics.fillRect(6, 18, 20, 8);
      graphics.fillRect(10, 0, 12, 4);
    }

    graphics.fillStyle(faceColor, 1);
    graphics.fillRect(12, 10, 8, 6);

    graphics.fillStyle(0x4d3425, 1);
    graphics.fillRect(11, 12, 2, 2);
    graphics.fillRect(19, 12, 2, 2);
    graphics.fillRect(14, 16, 4, 2);

    graphics.generateTexture(key, 32, 32);
    graphics.destroy();
  }

  makeStationTexture(key, color, stationType) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });

    graphics.fillStyle(0x6c4532, 1);
    graphics.fillRect(0, 14, 64, 36);
    graphics.fillStyle(color, 1);
    graphics.fillRect(4, 4, 56, 18);
    graphics.fillStyle(0xffffff, 0.15);
    graphics.fillRect(4, 4, 56, 6);

    if (stationType === "ingredient") {
      graphics.fillStyle(0x2b1d14, 0.18);
      graphics.fillRect(8, 24, 48, 18);
    } else if (stationType === "assembly") {
      graphics.fillStyle(0xf4ead6, 1);
      graphics.fillRoundedRect(18, 8, 28, 14, 5);
      graphics.fillStyle(0xaed08b, 1);
      graphics.fillRect(24, 11, 16, 5);
    } else if (stationType === "counter") {
      graphics.fillStyle(0xfff1d2, 0.9);
      graphics.fillRect(12, 10, 40, 6);
      graphics.fillStyle(0x8a5339, 1);
      graphics.fillRect(18, 24, 28, 12);
    } else if (stationType === "trash") {
      graphics.fillStyle(0xc9c4bd, 1);
      graphics.fillRect(18, 10, 28, 22);
      graphics.fillStyle(0x847b72, 1);
      graphics.fillRect(16, 8, 32, 5);
      graphics.fillRect(24, 13, 2, 15);
      graphics.fillRect(31, 13, 2, 15);
      graphics.fillRect(38, 13, 2, 15);
    }

    graphics.generateTexture(key, 64, 50);
    graphics.destroy();
  }

  makeIngredientTexture(key, ingredient) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });

    if (ingredient.key === "noodles") {
      graphics.fillStyle(ingredient.color, 1);
      graphics.fillRoundedRect(3, 8, 26, 12, 5);
      graphics.fillStyle(ingredient.accent, 1);
      graphics.fillRect(8, 10, 14, 2);
      graphics.fillRect(6, 14, 18, 2);
    }

    if (ingredient.key === "broth") {
      graphics.fillStyle(0xeedfc2, 1);
      graphics.fillRoundedRect(5, 6, 22, 18, 6);
      graphics.fillStyle(ingredient.color, 1);
      graphics.fillRect(8, 9, 16, 10);
    }

    if (ingredient.key === "egg") {
      graphics.fillStyle(ingredient.color, 1);
      graphics.fillEllipse(16, 16, 18, 22);
      graphics.fillStyle(ingredient.accent, 1);
      graphics.fillCircle(16, 16, 5);
    }

    if (ingredient.key === "fishcake") {
      graphics.fillStyle(ingredient.color, 1);
      graphics.fillCircle(16, 16, 10);
      graphics.fillStyle(ingredient.accent, 1);
      graphics.fillCircle(16, 16, 4);
    }

    graphics.generateTexture(key, 32, 32);
    graphics.destroy();
  }

  makeBowlTexture(key, ingredientKeys) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });

    graphics.fillStyle(0xf4ead6, 1);
    graphics.fillRoundedRect(2, 10, 28, 15, 6);

    if (ingredientKeys.includes("broth")) {
      graphics.fillStyle(0xd98f61, 1);
      graphics.fillRect(5, 11, 22, 8);
    }

    if (ingredientKeys.includes("noodles")) {
      graphics.fillStyle(0xf1d488, 1);
      graphics.fillRect(7, 12, 18, 2);
      graphics.fillRect(8, 15, 16, 2);
    }

    if (ingredientKeys.includes("egg")) {
      graphics.fillStyle(0xf7f1d0, 1);
      graphics.fillCircle(12, 15, 4);
      graphics.fillStyle(0xe0b44b, 1);
      graphics.fillCircle(12, 15, 2);
    }

    if (ingredientKeys.includes("fishcake")) {
      graphics.fillStyle(0xf3c7d7, 1);
      graphics.fillCircle(21, 16, 4);
      graphics.fillStyle(0xd3729d, 1);
      graphics.fillCircle(21, 16, 2);
    }

    graphics.generateTexture(key, 32, 32);
    graphics.destroy();
  }

  createRoom() {
    this.add.rectangle(400, 300, 800, 600, 0xd59a62);
    this.add.rectangle(400, 300, 700, 500, 0xe5bf90);
    this.add.rectangle(400, 300, 660, 460, 0xf0cf9d, 0.12).setStrokeStyle(3, 0xf8e3bf, 0.45);

    for (let x = 90; x <= 710; x += 40) {
      for (let y = 70; y <= 530; y += 40) {
        this.add.rectangle(x, y, 34, 34, 0xedcfa3, 0.25);
      }
    }

    this.add.rectangle(370, 86, 560, 92, 0x926040);
    this.add.rectangle(610, 224, 152, 176, 0x774b33);
    this.add.rectangle(610, 300, 132, 20, 0x8f5c3d, 0.6);
    this.add.rectangle(400, 558, 190, 38, 0x7b4f35);
    this.add.circle(148, 78, 18, 0xffd59d, 0.55);
    this.add.circle(178, 90, 12, 0xf7b884, 0.45);
    this.add.circle(672, 84, 16, 0xc7e0a1, 0.7);
    this.add.circle(696, 92, 10, 0x93b37e, 0.65);
    this.add.text(208, 74, "Neko Noodle House", {
      fontFamily: "Trebuchet MS",
      fontSize: "18px",
      color: "#fff2d8"
    }).setOrigin(0.5);
    this.add.text(400, 554, "Door", {
      fontFamily: "Trebuchet MS",
      fontSize: "15px",
      color: "#fff2d8"
    }).setOrigin(0.5);
  }

  createStations() {
    this.stationObjects = {};

    Object.values(STATIONS).forEach((station) => {
      const sprite = this.add.sprite(station.x, station.y, `station-${station.key}`).setDepth(2);
      const glow = this.add.rectangle(station.x, station.y + 4, 72, 58, station.color, 0.08).setDepth(1);
      const label = this.add.text(station.x, station.y + 42, station.label, {
        fontFamily: "Trebuchet MS",
        fontSize: "14px",
        color: "#2f1c10",
        backgroundColor: "#f6e2bf",
        padding: { left: 6, right: 6, top: 2, bottom: 2 }
      }).setOrigin(0.5).setDepth(3);

      const icon =
        station.type === "ingredient"
          ? this.add.sprite(station.x, station.y + 1, `ingredient-${station.key}`).setScale(0.95).setDepth(3)
          : null;

      const zone = this.add.zone(station.x, station.y + 18, 78, 76);
      this.physics.world.enable(zone);
      zone.body.setAllowGravity(false);
      zone.body.moves = false;

      this.stationObjects[station.key] = { ...station, sprite, glow, label, icon, zone };
    });
  }

  createAssemblyPreview() {
    this.assemblyPreview = this.add.container(STATIONS.assembly.x, STATIONS.assembly.y + 2).setDepth(4);
    this.assemblyPreviewBowl = this.add.sprite(0, -2, "bowl-empty");
    this.assemblyPreviewIngredients = this.add.graphics();
    this.assemblyPreview.add([this.assemblyPreviewBowl, this.assemblyPreviewIngredients]);
  }

  createCharacters() {
    this.player = this.physics.add.sprite(280, 340, "cat");
    this.player.setSize(18, 20).setOffset(7, 10);
    this.player.setCollideWorldBounds(true);
    this.player.depth = 6;

    this.carrySprite = this.add.sprite(this.player.x, this.player.y - 24, "ingredient-noodles");
    this.carrySprite.setVisible(false);
    this.carrySprite.depth = 7;

    this.playerShadow = this.add.ellipse(this.player.x, this.player.y + 15, 20, 8, 0x6c4532, 0.24).setDepth(5);
  }

  createInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys("W,A,S,D");
    this.interactKey = this.input.keyboard.addKeys({
      primary: Phaser.Input.Keyboard.KeyCodes.E,
      alternate: Phaser.Input.Keyboard.KeyCodes.SPACE,
      start: Phaser.Input.Keyboard.KeyCodes.ENTER
    });
    this.upgradeKeys = this.input.keyboard.addKeys({
      one: Phaser.Input.Keyboard.KeyCodes.ONE,
      two: Phaser.Input.Keyboard.KeyCodes.TWO,
      three: Phaser.Input.Keyboard.KeyCodes.THREE
    });
  }

  createUi() {
    this.ui = {};

    this.ui.topPanel = this.add.rectangle(400, 30, 760, 48, 0x4d2f20, 0.92).setDepth(10);
    this.ui.moneyText = this.add.text(40, 16, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "18px",
      color: "#fff2d8"
    }).setDepth(11);

    this.ui.dayText = this.add.text(180, 16, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "18px",
      color: "#fff2d8"
    }).setDepth(11);

    this.ui.timerText = this.add.text(310, 16, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "18px",
      color: "#fff2d8"
    }).setDepth(11);

    this.ui.carryText = this.add.text(520, 16, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "16px",
      color: "#ffe6c1"
    }).setDepth(11);

    this.ui.taskText = this.add.text(760, 16, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "16px",
      color: "#ffe6c1",
      align: "right"
    }).setOrigin(1, 0).setDepth(11);

    this.ui.messagePanel = this.add.rectangle(400, 570, 760, 40, 0x4d2f20, 0.9).setDepth(10);
    this.ui.messageText = this.add.text(400, 560, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "17px",
      color: "#fff4df"
    }).setOrigin(0.5).setDepth(11);

    this.ui.assemblyText = this.add.text(STATIONS.assembly.x, 214, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "15px",
      color: "#2f1c10",
      backgroundColor: "#fff0d0",
      padding: { left: 8, right: 8, top: 4, bottom: 4 }
    }).setOrigin(0.5).setDepth(8);

    this.ui.startOverlay = this.add.container(0, 0).setDepth(20);
    const startBg = this.add.rectangle(400, 300, 800, 600, 0x2b1d14, 0.48);
    const startPanel = this.add.rectangle(400, 300, 420, 280, 0xffefcf, 0.96).setStrokeStyle(6, 0xa76542, 0.65);
    const startSteam1 = this.add.circle(337, 214, 12, 0xffffff, 0.25);
    const startSteam2 = this.add.circle(364, 190, 16, 0xffffff, 0.18);
    const startTitle = this.add.text(400, 210, "Neko\nNoodle House", {
      fontFamily: "Trebuchet MS",
      fontSize: "42px",
      fontStyle: "bold",
      align: "center",
      color: "#5a3421"
    }).setOrigin(0.5);
    const startTag = this.add.text(400, 292, "Cozy ramen rush for one hardworking cat", {
      fontFamily: "Trebuchet MS",
      fontSize: "17px",
      color: "#9a5d3e"
    }).setOrigin(0.5);
    const startHelp = this.add.text(400, 330, "Move: WASD / Arrows\nInteract: E / Space", {
      fontFamily: "Trebuchet MS",
      fontSize: "18px",
      align: "center",
      color: "#5a3421"
    }).setOrigin(0.5);
    this.ui.startButton = this.add.rectangle(400, 388, 220, 44, 0xb8744a, 1).setStrokeStyle(4, 0x8c4a2f, 0.8);
    this.ui.startButtonLabel = this.add.text(400, 388, "Open Shop", {
      fontFamily: "Trebuchet MS",
      fontSize: "20px",
      color: "#fff7e9"
    }).setOrigin(0.5);
    this.ui.startOverlay.add([
      startBg,
      startPanel,
      startSteam1,
      startSteam2,
      startTitle,
      startTag,
      startHelp,
      this.ui.startButton,
      this.ui.startButtonLabel
    ]);
    this.makeInteractiveButton(this.ui.startButton, this.ui.startButtonLabel, () => this.startGame());

    this.ui.endOverlay = this.add.container(0, 0).setDepth(20).setVisible(false);
    const overlayBg = this.add.rectangle(400, 300, 800, 600, 0x2b1d14, 0.64);
    const overlayPanel = this.add.rectangle(
      END_OVERLAY_LAYOUT.panelX,
      END_OVERLAY_LAYOUT.panelY,
      580,
      470,
      0xffefcf,
      0.96
    ).setStrokeStyle(6, 0xa76542, 0.65);
    const overlayTitle = this.add.text(400, END_OVERLAY_LAYOUT.titleY, "Day Complete", {
      fontFamily: "Trebuchet MS",
      fontSize: "30px",
      color: "#522f1d"
    }).setOrigin(0.5);
    this.ui.endMoneyText = this.add.text(400, END_OVERLAY_LAYOUT.moneyY, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "22px",
      color: "#8c4a2f"
    }).setOrigin(0.5);
    this.ui.endServedText = this.add.text(400, END_OVERLAY_LAYOUT.servedY, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "19px",
      color: "#5a3421"
    }).setOrigin(0.5);
    this.ui.endMistakesText = this.add.text(400, END_OVERLAY_LAYOUT.mistakesY, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "19px",
      color: "#5a3421"
    }).setOrigin(0.5);
    this.ui.endBankText = this.add.text(400, END_OVERLAY_LAYOUT.bankY, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "18px",
      color: "#8c4a2f"
    }).setOrigin(0.5);
    this.ui.upgradeHeaderText = this.add.text(400, END_OVERLAY_LAYOUT.headerY, "Upgrades", {
      fontFamily: "Trebuchet MS",
      fontSize: "22px",
      color: "#522f1d"
    }).setOrigin(0.5);
    this.ui.upgradeRows = UPGRADE_DEFS.map((upgrade, index) => {
      const rowY = END_OVERLAY_LAYOUT.firstRowY + index * UPGRADE_ROW_STEP;
      const text = this.add.text(400, rowY, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "15px",
        color: "#5a3421",
        align: "center"
      }).setOrigin(0.5);
      const barBg = this.add.rectangle(400, rowY + 20, UPGRADE_BAR_WIDTH, 12, 0xd9c3a4).setStrokeStyle(2, 0xa76542, 0.4);
      const barFill = this.add.rectangle(276, rowY + 20, 0, 8, 0xb8744a).setOrigin(0, 0.5);
      const levelText = this.add.text(534, rowY + 20, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "14px",
        color: "#7b4f35"
      }).setOrigin(1, 0.5);
      const hitArea = this.add.rectangle(400, rowY + 12, 380, 42, 0xffffff, 0.001);

      return { key: upgrade.key, text, barBg, barFill, levelText, hitArea };
    });
    this.ui.nextDayButton = this.add.rectangle(400, END_OVERLAY_LAYOUT.nextDayButtonY, 240, 42, 0xb8744a, 1).setStrokeStyle(4, 0x8c4a2f, 0.8);
    this.ui.nextDayButtonLabel = this.add.text(400, END_OVERLAY_LAYOUT.nextDayButtonY, "Start Next Day", {
      fontFamily: "Trebuchet MS",
      fontSize: "19px",
      color: "#fff7e9"
    }).setOrigin(0.5);
    const overlayHint = this.add.text(400, END_OVERLAY_LAYOUT.hintY, "Press 1-3 to buy upgrades, or click a row. Enter also starts the next day.", {
      fontFamily: "Trebuchet MS",
      fontSize: "14px",
      color: "#522f1d",
      align: "center"
    }).setOrigin(0.5);

    this.ui.endOverlay.add([
      overlayBg,
      overlayPanel,
      overlayTitle,
      this.ui.endMoneyText,
      this.ui.endServedText,
      this.ui.endMistakesText,
      this.ui.endBankText,
      this.ui.upgradeHeaderText,
      ...this.ui.upgradeRows.flatMap((row) => [row.hitArea, row.text, row.barBg, row.barFill, row.levelText]),
      this.ui.nextDayButton,
      this.ui.nextDayButtonLabel,
      overlayHint
    ]);

    this.ui.upgradeRows.forEach((row) => {
      this.makeInteractiveButton(row.hitArea, row.text, () => this.purchaseUpgrade(row.key));
    });
    this.makeInteractiveButton(this.ui.nextDayButton, this.ui.nextDayButtonLabel, () => this.startNextDay());

    this.setMessage(UI_TEXT.intro);
    this.updateUi();
  }

  makeInteractiveButton(target, label, handler) {
    target.setInteractive({ useHandCursor: true });
    target.on("pointerdown", handler);
    target.on("pointerover", () => {
      target.setAlpha(0.88);
      if (label?.setScale) {
        label.setScale(1.02);
      }
    });
    target.on("pointerout", () => {
      target.setAlpha(1);
      if (label?.setScale) {
        label.setScale(1);
      }
    });
  }

  createStartOverlay() {
    this.tweens.add({
      targets: this.ui.startOverlay.list[2],
      y: "-=16",
      alpha: 0.05,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    this.tweens.add({
      targets: this.ui.startOverlay.list[3],
      y: "-=20",
      alpha: 0.04,
      duration: 2300,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  setGameplayVisibility(visible) {
    this.ui.topPanel.setVisible(visible);
    this.ui.moneyText.setVisible(visible);
    this.ui.dayText.setVisible(visible);
    this.ui.timerText.setVisible(visible);
    this.ui.carryText.setVisible(visible);
    this.ui.taskText.setVisible(visible);
    this.ui.messagePanel.setVisible(visible);
    this.ui.messageText.setVisible(visible);
    this.ui.assemblyText.setVisible(visible);
    this.assemblyPreview.setVisible(visible);
    this.playerShadow.setVisible(visible);
    this.carrySprite.setVisible(visible && Boolean(this.playerState.holding));

    Object.values(this.stationObjects).forEach((station) => {
      station.sprite.setVisible(visible);
      station.glow.setVisible(visible);
      station.label.setVisible(visible);
      if (station.icon) {
        station.icon.setVisible(visible);
      }
    });
  }

  handleStartInput() {
    const startPressed =
      Phaser.Input.Keyboard.JustDown(this.interactKey.start) ||
      Phaser.Input.Keyboard.JustDown(this.interactKey.primary) ||
      Phaser.Input.Keyboard.JustDown(this.interactKey.alternate);

    if (!startPressed) {
      return;
    }

    this.startGame();
  }

  startGame() {
    this.gameStarted = true;
    this.ui.startOverlay.setVisible(false);
    this.setGameplayVisibility(true);
    this.resetDayState();
    this.updateAssemblyPreview();
    this.syncCarryVisual();
    this.scheduleNextCustomer(900);
    this.setMessage(UI_TEXT.firstCustomer);
  }

  updateDayTimer(delta) {
    this.dayTimeLeft = Math.max(0, this.dayTimeLeft - delta / 1000);

    if (this.dayTimeLeft === 0 && !this.gameEnded) {
      this.endDay();
    }
  }

  updatePlayerMovement() {
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;
    const moveSpeed = this.getPlayerSpeed();

    let velocityX = 0;
    let velocityY = 0;

    if (left) velocityX = -moveSpeed;
    else if (right) velocityX = moveSpeed;

    if (up) velocityY = -moveSpeed;
    else if (down) velocityY = moveSpeed;

    this.player.body.setVelocity(velocityX, velocityY);
    this.player.body.velocity.normalize().scale(moveSpeed);

    if (velocityX !== 0) {
      this.player.setFlipX(velocityX < 0);
    }

    this.animatePlayer(this.frameDelta || 16, velocityX !== 0 || velocityY !== 0);
    this.carrySprite.setPosition(this.player.x, this.player.y - 24);
    this.playerShadow.setPosition(this.player.x, this.player.y + 15);
  }

  animatePlayer(delta, isMoving) {
    this.player.animTick = (this.player.animTick || 0) + delta;
    const bobAmount = isMoving ? Math.sin(this.player.animTick * 0.024) * 2.4 : Math.sin(this.player.animTick * 0.01) * 1.2;
    const squash = isMoving ? 0.97 + Math.abs(Math.sin(this.player.animTick * 0.024)) * 0.06 : 1;

    this.player.setScale(1.02, squash);

    if (this.carrySprite.visible) {
      this.carrySprite.y = this.player.y - 24 + bobAmount * 0.18;
    }
  }

  updateCustomer(delta) {
    if (!this.currentCustomer) {
      return;
    }

    const customer = this.currentCustomer;

    if (customer.state === "waiting") {
      customer.patience = Math.max(0, customer.patience - (delta / 1000) * customer.patienceLossRate);
    }

    this.drawPatienceBar(customer);
    this.drawOrderBubble(customer);
    this.updateCustomerMood(customer, delta);

    if (customer.state === "arriving") {
      this.moveActorTowards(customer.sprite, customer.target, CUSTOMER_SPEED);
      if (Phaser.Math.Distance.Between(customer.sprite.x, customer.sprite.y, customer.target.x, customer.target.y) < 6) {
        customer.sprite.body.setVelocity(0, 0);
        customer.state = "waiting";
        customer.waitStartedAt = this.time.now;
        customer.moodText.setText("...");
        this.setMessage(`${customer.name} ordered ${RECIPES[customer.orderKey].label}.`);
      }
    }

    if (customer.state === "leaving") {
      this.moveActorTowards(customer.sprite, customer.exitTarget, CUSTOMER_SPEED + 12);
      if (customer.sprite.y > 610) {
        this.clearCustomer();
        this.scheduleNextCustomer(1200);
      }
    }

    if (customer.patience <= 0 && customer.state !== "leaving") {
      this.failCustomerOrder();
    }
  }

  updateCustomerMood(customer, delta) {
    customer.animTick = (customer.animTick || 0) + delta;
    customer.shadow.setPosition(customer.sprite.x, customer.sprite.y + 15);
    customer.orderBubble.setPosition(customer.sprite.x, customer.sprite.y - 76);
    customer.moodText.setPosition(customer.sprite.x, customer.sprite.y - 50);

    const ratio = customer.patience / MAX_PATIENCE;
    if (customer.state === "served") {
      customer.moodText.setText("^_^");
      customer.moodText.setColor("#7b4f35");
      return;
    }

    if (customer.state === "leaving" && customer.patience <= 0) {
      customer.moodText.setText(">_<");
      customer.moodText.setColor("#a04c34");
      return;
    }

    if (ratio < 0.3 && customer.state === "waiting") {
      customer.moodText.setText("hmph");
      customer.moodText.setColor("#a04c34");
    } else if (customer.state === "waiting") {
      customer.moodText.setText("...");
      customer.moodText.setColor("#5b3922");
    }
  }

  moveActorTowards(sprite, target, speed) {
    const angle = Phaser.Math.Angle.Between(sprite.x, sprite.y, target.x, target.y);
    sprite.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  handleInteraction() {
    const justPressed =
      Phaser.Input.Keyboard.JustDown(this.interactKey.primary) ||
      Phaser.Input.Keyboard.JustDown(this.interactKey.alternate);

    if (!justPressed) {
      return;
    }

    const nearestStation = this.getNearestStation();

    if (!nearestStation) {
      this.setMessage("Move closer to a station to interact.");
      return;
    }

    this.processStationInteraction(nearestStation);
  }

  getNearestStation() {
    let match = null;

    Object.values(this.stationObjects).forEach((station) => {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, station.zone.x, station.zone.y);
      if (distance <= 56 && (!match || distance < match.distance)) {
        match = { ...station, distance };
      }
    });

    return match;
  }

  processStationInteraction(station) {
    this.pulseStation(station.key);

    if (station.type === "ingredient") {
      this.pickUpIngredient(station.key);
      return;
    }

    if (station.type === "assembly") {
      this.interactWithAssembly();
      return;
    }

    if (station.type === "counter") {
      this.serveDish();
      return;
    }

    if (station.type === "trash") {
      this.discardHeldItem();
    }
  }

  pulseStation(stationKey) {
    const station = this.stationObjects[stationKey];
    this.tweens.killTweensOf(station.sprite);
    this.tweens.add({
      targets: station.sprite,
      scaleY: 1.06,
      scaleX: 1.03,
      duration: 110,
      yoyo: true,
      ease: "Quad.easeOut"
    });
  }

  pickUpIngredient(ingredientKey) {
    if (this.playerState.holding) {
      this.setMessage("You can only carry one ingredient or one bowl at a time.");
      return;
    }

    this.playerState.holding = { type: "ingredient", key: ingredientKey };
    this.syncCarryVisual();
    this.bounceCarrySprite();
    this.setMessage(`Picked up ${INGREDIENTS[ingredientKey].label.toLowerCase()}.`);
  }

  interactWithAssembly() {
    const holding = this.playerState.holding;

    if (holding?.type === "ingredient") {
      this.addIngredientToAssembly(holding.key);
      return;
    }

    if (holding?.type === "bowl") {
      this.setMessage("Bring the finished bowl to the counter.");
      return;
    }

    if (this.assemblyState.ingredients.length === 0) {
      this.setMessage("Bring an ingredient here to start a bowl.");
      return;
    }

    const recipe = this.getRecipeForIngredients(this.assemblyState.ingredients);

    if (!recipe) {
      this.setMessage("This bowl is incomplete. Add the missing ingredient.");
      return;
    }

    this.playerState.holding = {
      type: "bowl",
      recipeKey: recipe.key
    };
    this.assemblyState = this.createEmptyAssemblyState();
    this.syncCarryVisual();
    this.updateAssemblyPreview();
    this.bounceCarrySprite();
    this.setMessage(`${recipe.label} is ready to serve.`);
  }

  discardHeldItem() {
    const holding = this.playerState.holding;

    if (!holding) {
      this.setMessage("You are not carrying anything.");
      return;
    }

    this.playerState.holding = null;
    this.syncCarryVisual();
    this.setMessage(holding.type === "ingredient" ? "Ingredient tossed away." : "Bowl thrown away.");
  }

  addIngredientToAssembly(ingredientKey) {
    if (this.assemblyState.ingredients.includes(ingredientKey)) {
      this.setMessage(`${INGREDIENTS[ingredientKey].label} is already in the bowl.`);
      return;
    }

    if (!this.canIngredientBeAdded(ingredientKey)) {
      this.setMessage("Start every bowl with noodles and broth, then add one topping.");
      return;
    }

    this.assemblyState.ingredients.push(ingredientKey);
    this.sortIngredients(this.assemblyState.ingredients);
    this.playerState.holding = null;
    this.syncCarryVisual();
    this.updateAssemblyPreview();
    this.bounceAssemblyPreview();

    const recipe = this.getRecipeForIngredients(this.assemblyState.ingredients);
    if (recipe) {
      this.setMessage(`${recipe.label} is complete. Interact again to pick it up.`);
      return;
    }

    this.setMessage(`Added ${INGREDIENTS[ingredientKey].label.toLowerCase()} to the bowl.`);
  }

  canIngredientBeAdded(ingredientKey) {
    const current = this.assemblyState.ingredients;

    if (current.length === 0) {
      return ingredientKey === "noodles";
    }

    if (current.length === 1) {
      return current[0] === "noodles" && ingredientKey === "broth";
    }

    if (current.length === 2) {
      return ["egg", "fishcake"].includes(ingredientKey);
    }

    return false;
  }

  serveDish() {
    if (!this.currentCustomer || this.currentCustomer.state !== "waiting") {
      this.setMessage("Nobody is waiting at the counter.");
      return;
    }

    const holding = this.playerState.holding;
    if (!holding || holding.type !== "bowl") {
      this.setMessage("You need a finished bowl to serve.");
      return;
    }

    if (holding.recipeKey !== this.currentCustomer.orderKey) {
      const servedLabel = RECIPES[holding.recipeKey].label;
      this.playerState.holding = null;
      this.syncCarryVisual();
      this.currentCustomer.patience = Math.max(0, this.currentCustomer.patience - 28);
      this.mistakesMade += 1;
      this.flashCustomerMood(this.currentCustomer, "!?");
      this.setMessage(`${servedLabel} was the wrong order. The customer is less patient now.`);
      return;
    }

    const recipe = RECIPES[this.currentCustomer.orderKey];
    const tip = this.calculateTipBonus(this.currentCustomer);
    const reward = recipe.reward + tip;
    const customerName = this.currentCustomer.name;

    this.money += reward;
    this.bankMoney += reward;
    this.dayEarnings += reward;
    this.customersServed += 1;
    this.playerState.holding = null;
    this.syncCarryVisual();
    this.currentCustomer.state = "served";
    this.currentCustomer.sprite.body.setVelocity(0, 0);
    this.playServedReaction(this.currentCustomer);

    this.time.delayedCall(420, () => {
      if (this.currentCustomer) {
        this.currentCustomer.state = "leaving";
      }
    });

    if (tip > 0) {
      this.setMessage(`${customerName} loved the quick service. Earned $${recipe.reward} + $${tip} tip.`);
      return;
    }

    this.setMessage(`${customerName} is happy. You earned $${recipe.reward}.`);
  }

  calculateTipBonus(customer) {
    const patienceRatio = customer.patience / MAX_PATIENCE;
    if (patienceRatio < 0.55) {
      return 0;
    }

    return Math.max(1, Math.round(MAX_TIP * patienceRatio * this.getTipMultiplier()));
  }

  spawnCustomer() {
    if (this.gameEnded || this.currentCustomer) {
      return;
    }

    const variant = Phaser.Utils.Array.GetRandom(CUSTOMER_VARIANTS);
    const recipe = Phaser.Utils.Array.GetRandom(RECIPE_LIST);
    const textureKey = `customer-${variant.name.replace(/\s+/g, "-").toLowerCase()}`;

    if (!this.textures.exists(textureKey)) {
      this.makeCharacterTexture(textureKey, variant.tint, variant.shirt, 0xf9eee2, "human");
    }

    const sprite = this.physics.add.sprite(400, 624, textureKey);
    sprite.setSize(18, 20).setOffset(7, 10);
    sprite.setCollideWorldBounds(false);
    sprite.depth = 6;

    const shadow = this.add.ellipse(sprite.x, sprite.y + 15, 18, 8, 0x6c4532, 0.24).setDepth(5);
    const patienceBar = this.add.graphics().setDepth(7);
    const orderBubble = this.add.container(0, 0).setDepth(8);
    const orderBubbleBackground = this.add.graphics();
    const orderBubbleText = this.add.text(0, -10, recipe.shortLabel, {
      fontFamily: "Trebuchet MS",
      fontSize: "13px",
      color: "#2f1c10"
    }).setOrigin(0.5);
    const orderBubbleBowl = this.add.sprite(0, 10, `bowl-${recipe.key}`);
    orderBubble.add([orderBubbleBackground, orderBubbleText, orderBubbleBowl]);

    const moodText = this.add.text(sprite.x, sprite.y - 50, "...", {
      fontFamily: "Trebuchet MS",
      fontSize: "14px",
      color: "#5b3922"
    }).setOrigin(0.5).setDepth(8);

    this.currentCustomer = {
      name: variant.name,
      orderKey: recipe.key,
      sprite,
      shadow,
      moodText,
      patienceBar,
      orderBubble,
      orderBubbleBackground,
      orderBubbleText,
      patience: MAX_PATIENCE,
      patienceLossRate: Phaser.Math.FloatBetween(7, 10) * this.getPatienceDecayMultiplier(),
      state: "arriving",
      target: { x: STATIONS.counter.x, y: 320 },
      exitTarget: { x: 400, y: 640 },
      waitStartedAt: null,
      animTick: 0
    };

    this.setMessage(`${variant.name} entered the noodle house.`);
  }

  drawPatienceBar(customer) {
    const x = customer.sprite.x - 22;
    const y = customer.sprite.y - 34;
    const width = 44;
    const ratio = customer.patience / MAX_PATIENCE;

    customer.patienceBar.clear();
    customer.patienceBar.fillStyle(0x2b1d14, 0.8);
    customer.patienceBar.fillRect(x - 1, y - 1, width + 2, 8);
    customer.patienceBar.fillStyle(0x5b3922, 1);
    customer.patienceBar.fillRect(x, y, width, 6);
    customer.patienceBar.fillStyle(ratio > 0.4 ? 0x8dc26f : 0xd66a4d, 1);
    customer.patienceBar.fillRect(x, y, width * ratio, 6);
  }

  drawOrderBubble(customer) {
    const recipe = RECIPES[customer.orderKey];
    customer.orderBubbleBackground.clear();
    customer.orderBubbleBackground.fillStyle(0xfff5df, 1);
    customer.orderBubbleBackground.fillRoundedRect(-42, -28, 84, 50, 10);
    customer.orderBubbleBackground.fillStyle(recipe.color, 1);
    customer.orderBubbleBackground.fillRoundedRect(-30, -22, 60, 14, 6);
    customer.orderBubbleBackground.fillStyle(0xfff5df, 1);
    customer.orderBubbleBackground.fillTriangle(-10, 22, 0, 30, 10, 22);
  }

  flashCustomerMood(customer, text) {
    customer.moodText.setText(text);
    customer.moodText.setColor("#a04c34");
    this.tweens.add({
      targets: customer.moodText,
      y: customer.moodText.y - 8,
      alpha: 0.35,
      duration: 260,
      yoyo: true,
      ease: "Quad.easeOut",
      onComplete: () => {
        if (customer.moodText.active) {
          customer.moodText.setAlpha(1);
        }
      }
    });
  }

  playServedReaction(customer) {
    customer.moodText.setText("yay!");
    customer.moodText.setColor("#7b4f35");
    this.tweens.add({
      targets: customer.sprite,
      y: customer.sprite.y - 8,
      duration: 160,
      yoyo: true,
      repeat: 1,
      ease: "Quad.easeOut"
    });
  }

  bounceCarrySprite() {
    if (!this.carrySprite.visible) {
      return;
    }

    this.tweens.killTweensOf(this.carrySprite);
    this.carrySprite.setScale(1);
    this.tweens.add({
      targets: this.carrySprite,
      scaleX: 1.18,
      scaleY: 1.18,
      y: this.carrySprite.y - 5,
      duration: 110,
      yoyo: true,
      ease: "Back.easeOut"
    });
  }

  bounceAssemblyPreview() {
    this.tweens.killTweensOf(this.assemblyPreview);
    this.tweens.add({
      targets: this.assemblyPreview,
      y: this.assemblyPreview.y - 5,
      duration: 120,
      yoyo: true,
      ease: "Quad.easeOut"
    });
  }

  failCustomerOrder() {
    if (!this.currentCustomer) {
      return;
    }

    this.flashCustomerMood(this.currentCustomer, "hmph");
    this.setMessage(`${this.currentCustomer.name} ran out of patience and left.`);
    this.currentCustomer.state = "leaving";
    this.currentCustomer.patience = 0;
  }

  clearCustomer() {
    if (!this.currentCustomer) {
      return;
    }

    this.currentCustomer.patienceBar.destroy();
    this.currentCustomer.orderBubble.destroy();
    this.currentCustomer.shadow.destroy();
    this.currentCustomer.moodText.destroy();
    this.currentCustomer.sprite.destroy();
    this.currentCustomer = null;
  }

  scheduleNextCustomer(delay) {
    this.time.delayedCall(delay, () => {
      if (!this.gameEnded) {
        this.spawnCustomer();
      }
    });
  }

  setMessage(message) {
    this.ui.messageText.setText(message);
  }

  updateUi() {
    this.ui.moneyText.setText(`Bank: $${this.bankMoney}`);
    this.ui.dayText.setText(`Day ${this.dayNumber}`);
    this.ui.timerText.setText(`Time Left: ${Math.ceil(this.dayTimeLeft)}s`);
    this.ui.carryText.setText(`Carry: ${this.getCarryLabel()}`);
    this.ui.taskText.setText(this.getTaskText());
    this.ui.assemblyText.setText(`Assembly: ${this.getAssemblyLabel()}`);
  }

  getCarryLabel() {
    const holding = this.playerState.holding;
    if (!holding) {
      return "empty";
    }

    if (holding.type === "ingredient") {
      return INGREDIENTS[holding.key].label;
    }

    return RECIPES[holding.recipeKey].shortLabel;
  }

  getTaskText() {
    const holding = this.playerState.holding;

    if (!this.gameStarted) {
      return "Task: Open shop";
    }

    if (holding?.type === "ingredient") {
      return "Task: Add to bowl";
    }

    if (holding?.type === "bowl") {
      return "Task: Serve order";
    }

    const recipe = this.getRecipeForIngredients(this.assemblyState.ingredients);
    if (recipe) {
      return "Task: Pick up bowl";
    }

    if (this.assemblyState.ingredients.length > 0) {
      return "Task: Finish recipe";
    }

    if (this.currentCustomer?.state === "waiting") {
      return `Task: ${RECIPES[this.currentCustomer.orderKey].shortLabel}`;
    }

    return "Task: Await guest";
  }

  getAssemblyLabel() {
    if (this.assemblyState.ingredients.length === 0) {
      return "empty bowl";
    }

    const recipe = this.getRecipeForIngredients(this.assemblyState.ingredients);
    if (recipe) {
      return `${recipe.shortLabel} ready`;
    }

    return this.assemblyState.ingredients.map((key) => INGREDIENTS[key].label).join(" + ");
  }

  updateAssemblyPreview() {
    const ingredients = this.assemblyState.ingredients;
    const recipe = this.getRecipeForIngredients(ingredients);
    const textureKey = recipe ? `bowl-${recipe.key}` : "bowl-empty";
    this.assemblyPreviewBowl.setTexture(textureKey);
    this.assemblyPreviewBowl.setAlpha(ingredients.length === 0 ? 0.45 : 1);

    this.assemblyPreviewIngredients.clear();
    ingredients.forEach((ingredientKey) => {
      const rect = ASSEMBLY_HIGHLIGHT_RECTS[ingredientKey];
      const ingredient = INGREDIENTS[ingredientKey];
      this.assemblyPreviewIngredients.fillStyle(ingredient.color, 1);
      if (ingredientKey === "egg" || ingredientKey === "fishcake") {
        this.assemblyPreviewIngredients.fillCircle(rect.x + 4, rect.y + 4, 4);
      } else {
        this.assemblyPreviewIngredients.fillRect(rect.x, rect.y, rect.width, rect.height);
      }
    });
  }

  syncCarryVisual() {
    const holding = this.playerState.holding;

    if (!holding) {
      this.carrySprite.setVisible(false);
      return;
    }

    const textureKey =
      holding.type === "ingredient" ? `ingredient-${holding.key}` : `bowl-${holding.recipeKey}`;

    this.carrySprite.setTexture(textureKey);
    this.carrySprite.setVisible(true);
  }

  getRecipeForIngredients(ingredientKeys) {
    const normalized = [...ingredientKeys];
    this.sortIngredients(normalized);

    return (
      RECIPE_LIST.find((recipe) => {
        if (recipe.ingredients.length !== normalized.length) {
          return false;
        }

        return recipe.ingredients.every((ingredient, index) => ingredient === normalized[index]);
      }) || null
    );
  }

  sortIngredients(ingredientKeys) {
    ingredientKeys.sort((a, b) => INGREDIENT_ORDER.indexOf(a) - INGREDIENT_ORDER.indexOf(b));
  }

  getPlayerSpeed() {
    return PLAYER_SPEED + this.upgrades.movement * 12;
  }

  getPatienceDecayMultiplier() {
    return 1 - this.upgrades.patience * 0.08;
  }

  getTipMultiplier() {
    return 1 + this.upgrades.tips * 0.2;
  }

  getUpgradeCost(upgradeKey) {
    const definition = this.getUpgradeDef(upgradeKey);
    const level = this.upgrades[upgradeKey];
    return definition.baseCost + definition.costStep * level;
  }

  handleUpgradeInput() {
    if (Phaser.Input.Keyboard.JustDown(this.upgradeKeys.one)) {
      this.purchaseUpgrade("movement");
    }

    if (Phaser.Input.Keyboard.JustDown(this.upgradeKeys.two)) {
      this.purchaseUpgrade("patience");
    }

    if (Phaser.Input.Keyboard.JustDown(this.upgradeKeys.three)) {
      this.purchaseUpgrade("tips");
    }

    if (Phaser.Input.Keyboard.JustDown(this.interactKey.start)) {
      this.startNextDay();
    }
  }

  purchaseUpgrade(upgradeKey) {
    const definition = this.getUpgradeDef(upgradeKey);
    const level = this.upgrades[upgradeKey];

    if (level >= definition.maxLevel) {
      this.setMessage(`${definition.label} is already maxed.`);
      return;
    }

    const cost = this.getUpgradeCost(upgradeKey);
    if (this.bankMoney < cost) {
      this.setMessage(`Not enough money for ${definition.label}.`);
      return;
    }

    this.bankMoney -= cost;
    this.upgrades[upgradeKey] += 1;
    this.refreshUpgradeUi();
    this.updateUi();
    this.setMessage(`Bought ${definition.label} Lv.${this.upgrades[upgradeKey]}.`);
  }

  refreshUpgradeUi() {
    if (!this.ui.upgradeRows) {
      return;
    }

    UPGRADE_DEFS.forEach((upgrade, index) => {
      const level = this.upgrades[upgrade.key];
      const isMaxed = level >= upgrade.maxLevel;
      const costText = isMaxed ? "MAX" : `$${this.getUpgradeCost(upgrade.key)}`;
      const ratio = level / upgrade.maxLevel;
      const row = this.ui.upgradeRows[index];

      row.text
        .setText(`${index + 1}. ${upgrade.label}  ${upgrade.description}  ${costText}`)
        .setColor(isMaxed ? "#8a7b68" : "#5a3421");
      row.barFill.width = UPGRADE_BAR_WIDTH * ratio;
      row.barFill.setFillStyle(isMaxed ? 0x8a7b68 : 0xb8744a, 1);
      row.levelText.setText(`Lv ${level}/${upgrade.maxLevel}`);
    });

    this.ui.endBankText.setText(`Bank after shift: $${this.bankMoney}`);
  }

  startNextDay() {
    this.dayNumber += 1;
    this.resetDayState();
    this.ui.endOverlay.setVisible(false);
    this.updateAssemblyPreview();
    this.syncCarryVisual();
    this.player.setPosition(280, 340);
    this.playerShadow.setPosition(this.player.x, this.player.y + 15);
    this.scheduleNextCustomer(900);
    this.updateUi();
    this.setMessage(`Day ${this.dayNumber} begins. The broth is hot.`);
  }

  endDay() {
    this.gameEnded = true;
    this.clearCustomer();
    this.playerState = this.createEmptyPlayerState();
    this.assemblyState = this.createEmptyAssemblyState();
    this.syncCarryVisual();
    this.updateAssemblyPreview();
    this.ui.endMoneyText.setText(`Money earned: $${this.dayEarnings}`);
    this.ui.endServedText.setText(`Customers served: ${this.customersServed}`);
    this.ui.endMistakesText.setText(`Mistakes made: ${this.mistakesMade}`);
    this.refreshUpgradeUi();
    this.ui.endOverlay.setVisible(true);
    this.setMessage("Shift ended.");
  }
}
