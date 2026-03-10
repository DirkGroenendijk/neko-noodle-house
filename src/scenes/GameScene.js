import {
  BLOCKED_LAYOUT_TILES,
  CUSTOMER_SPEED,
  CUSTOMER_VARIANTS,
  DAY_TIME_INCREMENT,
  DAY_LENGTH_SECONDS,
  DINING_DURATION_SECONDS,
  GRID_CONFIG,
  INGREDIENTS,
  MAX_PATIENCE,
  MAX_TIP,
  PLACEABLE_ITEMS,
  PIXEL_PALETTE,
  PLAYER_SPEED,
  RECIPES,
  STATIONS,
  UPGRADE_DEFS
} from "../data/gameData.js";

const RECIPE_LIST = Object.values(RECIPES);
const UPGRADE_BY_KEY = Object.fromEntries(UPGRADE_DEFS.map((upgrade) => [upgrade.key, upgrade]));
const PLACEABLE_BY_KEY = Object.fromEntries(PLACEABLE_ITEMS.map((item) => [item.key, item]));
const STATION_ITEMS = PLACEABLE_ITEMS.filter((item) => item.type === "station");
const TABLE_ITEMS = PLACEABLE_ITEMS.filter((item) => item.type === "table");
const BLOCKED_TILE_SET = new Set(BLOCKED_LAYOUT_TILES);
const INGREDIENT_ORDER = ["noodles", "broth", "egg", "fishcake"];
const UPGRADE_BAR_WIDTH = 250;
const UPGRADE_ROW_STEP = 42;
const ORDER_SPAWN_DELAY = 900;
const MAP_TILE_SIZE = 32;
const GRID_BOUNDS = {
  x: GRID_CONFIG.originX,
  y: GRID_CONFIG.originY,
  width: GRID_CONFIG.cols * GRID_CONFIG.tileSize,
  height: GRID_CONFIG.rows * GRID_CONFIG.tileSize
};
const END_OVERLAY_LAYOUT = {
  panelX: 400,
  panelY: 276,
  titleY: 190,
  moneyY: 230,
  servedY: 260,
  mistakesY: 288,
  bankY: 316,
  headerY: 346,
  firstRowY: 374,
  nextDayButtonY: 476,
  hintY: 510
};
const UI_TEXT = {
  welcome: "Welcome to the noodle house.",
  intro: "Arrange the shop, then start the day.",
  layoutPrompt: "Select an item and click the grid to place it.",
  serviceStart: "The first customer is on the way.",
  needTable: "Place at least one table before starting the day."
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
    this.phase = "title";
    this.dayNumber = 1;
    this.dayTimeLeft = DAY_LENGTH_SECONDS;
    this.bankMoney = 0;
    this.dayEarnings = 0;
    this.money = 0;
    this.customersServed = 0;
    this.mistakesMade = 0;
    this.playerState = this.createEmptyPlayerState();
    this.assemblyState = this.createEmptyAssemblyState();
    this.upgrades = this.createUpgradeState();
    this.layoutState = this.createDefaultLayoutState();
    this.tableStates = this.createTableStates();
    this.orderCustomer = null;
    this.diningCustomers = [];
    this.orderSpawnPending = false;
    this.selectedLayoutItemKey = PLACEABLE_ITEMS[0].key;
    this.gameStarted = false;

    this.createTextures();
    this.createTilemapRoom();
    this.createGrid();
    this.createPlacedObjects();
    this.createAssemblyPreview();
    this.createCharacters();
    this.createAnimations();
    this.createInput();
    this.createUi();
    this.createStartOverlay();
    this.bindLayoutPlacement();
    this.enterTitlePhase();
  }

  update(_time, delta) {
    this.frameDelta = delta;

    if (this.phase === "title") {
      this.handleTitleInput();
      this.animatePlayer(delta, false);
      return;
    }

    if (this.phase === "layout") {
      this.updateUi();
      return;
    }

    if (this.phase === "upgrade") {
      this.handleUpgradeInput();
      this.animatePlayer(delta, false);
      this.updateUi();
      return;
    }

    this.updateDayTimer(delta);
    this.updatePlayerMovement();
    this.updateOrderingCustomer(delta);
    this.updateDiningCustomers(delta);
    this.updateUi();
    this.handleInteraction();
  }

  createEmptyPlayerState() {
    return { holding: null };
  }

  createEmptyAssemblyState() {
    return { ingredients: [] };
  }

  createUpgradeState() {
    return { movement: 0, patience: 0, tips: 0 };
  }

  createDefaultLayoutState() {
    const placements = {};

    PLACEABLE_ITEMS.forEach((item) => {
      placements[item.key] = { ...item.tile };
    });

    return { placements };
  }

  createTableStates() {
    return Object.fromEntries(TABLE_ITEMS.map((item) => [item.key, { occupiedBy: null }]));
  }

  resetDayState() {
    this.dayTimeLeft = DAY_LENGTH_SECONDS + (this.dayNumber - 1) * DAY_TIME_INCREMENT;
    this.dayEarnings = 0;
    this.customersServed = 0;
    this.mistakesMade = 0;
    this.playerState = this.createEmptyPlayerState();
    this.assemblyState = this.createEmptyAssemblyState();
    this.orderCustomer = null;
    this.clearDiningCustomers();
    this.tableStates = this.createTableStates();
    this.orderSpawnPending = false;
  }

  getUpgradeDef(upgradeKey) {
    return UPGRADE_BY_KEY[upgradeKey];
  }

  createTextures() {
    if (this.textures.exists("cat")) {
      return;
    }

    this.makeInteriorTileset();
    this.makeCharacterSheet("cat", {
      fur: "#d6a066",
      accent: "#a0643d",
      face: "#f7e4c9",
      outfit: "#7d9a62"
    }, "cat");

    CUSTOMER_VARIANTS.forEach((variant) => {
      const textureKey = `customer-${variant.name.replace(/\s+/g, "-").toLowerCase()}`;
      this.makeCharacterSheet(textureKey, {
        fur: Phaser.Display.Color.IntegerToColor(variant.tint).rgba,
        accent: Phaser.Display.Color.IntegerToColor(variant.shirt).rgba,
        face: "#f1dfc8",
        outfit: Phaser.Display.Color.IntegerToColor(variant.shirt).rgba
      }, "human");
    });

    Object.values(STATIONS).forEach((station) => {
      this.makeStationTexture(`station-${station.key}`, station.type);
    });

    Object.values(INGREDIENTS).forEach((ingredient) => {
      this.makeIngredientTexture(`ingredient-${ingredient.key}`, ingredient.key);
    });

    this.makeTableTexture("table");
    this.makeBowlTexture("bowl-empty", []);
    RECIPE_LIST.forEach((recipe) => this.makeBowlTexture(`bowl-${recipe.key}`, recipe.ingredients));
  }

  makeInteriorTileset() {
    const canvasTexture = this.textures.createCanvas("interior-tiles", MAP_TILE_SIZE * 10, MAP_TILE_SIZE);
    const ctx = canvasTexture.context;
    const p = PIXEL_PALETTE;
    const draw = (tileIndex, fn) => {
      const ox = tileIndex * MAP_TILE_SIZE;
      fn(ox, 0, ctx);
    };
    const fill = (x, y, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    };

    draw(0, (ox) => {
      fill(ox, 0, 32, 32, p.floorA);
    });
    draw(1, (ox) => {
      fill(ox, 0, 32, 32, p.floorA);
    });
    draw(2, (ox) => {
      fill(ox, 0, 32, 32, p.wall);
      fill(ox, 24, 32, 8, p.woodMid);
      fill(ox, 28, 32, 4, p.woodDark);
    });
    draw(3, (ox) => {
      fill(ox, 0, 32, 32, p.wall);
      fill(ox, 24, 32, 8, p.woodMid);
      fill(ox + 12, 10, 8, 10, p.clothRed);
      fill(ox + 14, 12, 4, 6, p.paper);
    });
    draw(4, (ox) => {
      fill(ox, 0, 32, 32, p.wall);
      fill(ox, 24, 32, 8, p.woodMid);
      fill(ox + 12, 7, 8, 8, p.brass);
      fill(ox + 10, 15, 12, 8, p.lantern);
    });
    draw(5, (ox) => {
      fill(ox, 0, 32, 32, "rgba(0,0,0,0)");
      fill(ox + 8, 20, 16, 8, p.woodDark);
      fill(ox + 10, 10, 12, 12, p.plant);
      fill(ox + 14, 4, 4, 8, p.plantDark);
    });
    draw(6, (ox) => {
      fill(ox, 0, 32, 32, "rgba(0,0,0,0)");
      fill(ox + 0, 20, 32, 8, p.counterTop);
      fill(ox + 0, 24, 32, 8, p.woodDark);
    });
    draw(7, (ox) => {
      fill(ox, 0, 32, 32, "rgba(0,0,0,0)");
      fill(ox + 8, 10, 16, 16, p.paper);
      fill(ox + 12, 14, 8, 8, p.clothBlue);
    });
    draw(8, (ox) => {
      fill(ox, 0, 32, 32, "rgba(0,0,0,0)");
      fill(ox + 12, 8, 8, 20, p.woodDark);
      fill(ox + 7, 4, 18, 7, p.counterTop);
    });
    draw(9, (ox) => {
      fill(ox, 0, 32, 32, "rgba(0,0,0,0)");
      fill(ox + 4, 22, 24, 6, p.shadow);
      fill(ox + 6, 6, 20, 16, p.clothRed);
      fill(ox + 8, 8, 16, 12, p.paper);
    });

    canvasTexture.refresh();
  }

  makeCharacterSheet(key, colors, kind) {
    const canvasTexture = this.textures.createCanvas(key, 96, 128);
    const ctx = canvasTexture.context;
    const directions = ["down", "left", "right", "up"];
    const dirOffsets = {
      down: { ax: 0, ay: 0 },
      left: { ax: -1, ay: 0 },
      right: { ax: 1, ay: 0 },
      up: { ax: 0, ay: -1 }
    };

    const fill = (x, y, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    };

    directions.forEach((direction, row) => {
      [0, 1, 2].forEach((frame) => {
        const ox = frame * 32;
        const oy = row * 32;
        const step = frame === 1 ? 1 : 0;
        fill(ox, oy, 32, 32, "rgba(0,0,0,0)");
        fill(ox + 10, oy + 8, 12, 12, colors.fur);
        fill(ox + 8, oy + 18, 16, 8, colors.outfit || colors.accent);
        fill(ox + 11 + step, oy + 26, 3, 4, PIXEL_PALETTE.outline);
        fill(ox + 18 - step, oy + 26, 3, 4, PIXEL_PALETTE.outline);
        fill(ox + 11, oy + 10, 10, 8, colors.face);
        fill(ox + 12, oy + 12, 2, 2, PIXEL_PALETTE.outline);
        fill(ox + 18, oy + 12, 2, 2, PIXEL_PALETTE.outline);
        fill(ox + 14, oy + 16, 4, 2, PIXEL_PALETTE.outline);

        if (kind === "cat") {
          fill(ox + 10, oy + 4, 3, 4, colors.fur);
          fill(ox + 19, oy + 4, 3, 4, colors.fur);
          const tail = dirOffsets[direction];
          fill(ox + 24 + tail.ax * 2, oy + 15 + tail.ay * 2, 2, 8, colors.accent);
        } else {
          fill(ox + 10, oy + 4, 12, 4, colors.fur);
          fill(ox + 8, oy + 20, 16, 2, colors.accent);
        }
      });
    });

    canvasTexture.refresh();
    const texture = this.textures.get(key);
    for (let row = 0; row < 4; row += 1) {
      for (let frame = 0; frame < 3; frame += 1) {
        texture.add(row * 3 + frame, 0, frame * 32, row * 32, 32, 32);
      }
    }
  }

  makeStationTexture(key, stationType) {
    const canvasTexture = this.textures.createCanvas(key, 64, 64);
    const ctx = canvasTexture.context;
    const p = PIXEL_PALETTE;
    const fill = (x, y, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    };

    fill(8, 28, 48, 24, p.woodDark);
    fill(6, 12, 52, 18, p.counterTop);
    fill(8, 14, 48, 4, p.paper);

    if (stationType === "ingredient") {
      fill(12, 20, 40, 6, p.counterTop);
    } else if (stationType === "assembly") {
      fill(18, 18, 28, 10, p.bowl);
      fill(22, 21, 20, 4, p.clothGreen);
    } else if (stationType === "counter") {
      fill(16, 16, 32, 8, p.paper);
      fill(22, 28, 20, 12, p.woodMid);
    } else if (stationType === "trash") {
      fill(20, 16, 24, 22, p.steel);
      fill(18, 12, 28, 5, p.shadow);
      fill(24, 18, 2, 16, p.shadow);
      fill(31, 18, 2, 16, p.shadow);
      fill(38, 18, 2, 16, p.shadow);
    }

    canvasTexture.refresh();
  }

  makeIngredientTexture(key, ingredientKey) {
    const canvasTexture = this.textures.createCanvas(key, 32, 32);
    const ctx = canvasTexture.context;
    const p = PIXEL_PALETTE;
    const fill = (x, y, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    };

    fill(0, 0, 32, 32, "rgba(0,0,0,0)");

    if (ingredientKey === "noodles") {
      fill(5, 10, 22, 8, p.noodles);
      fill(8, 12, 14, 1, p.outline);
      fill(7, 15, 16, 1, p.outline);
    } else if (ingredientKey === "broth") {
      fill(7, 8, 18, 14, p.bowl);
      fill(9, 10, 14, 8, p.broth);
    } else if (ingredientKey === "egg") {
      fill(10, 7, 12, 16, p.egg);
      fill(13, 11, 6, 6, p.yolk);
    } else if (ingredientKey === "fishcake") {
      fill(9, 9, 14, 14, p.fishcake);
      fill(13, 13, 6, 6, p.fishcakeDark);
    }

    canvasTexture.refresh();
  }

  makeTableTexture(key) {
    const canvasTexture = this.textures.createCanvas(key, 64, 64);
    const ctx = canvasTexture.context;
    const p = PIXEL_PALETTE;
    const fill = (x, y, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    };
    fill(16, 18, 32, 16, p.woodMid);
    fill(20, 14, 24, 4, p.counterTop);
    fill(28, 34, 8, 16, p.woodDark);
    fill(10, 20, 8, 8, p.paper);
    fill(46, 20, 8, 8, p.paper);
    canvasTexture.refresh();
  }

  makeBowlTexture(key, ingredientKeys) {
    const canvasTexture = this.textures.createCanvas(key, 32, 32);
    const ctx = canvasTexture.context;
    const p = PIXEL_PALETTE;
    const fill = (x, y, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    };
    fill(2, 10, 28, 12, p.bowl);
    if (ingredientKeys.includes("broth")) fill(5, 11, 22, 6, p.broth);
    if (ingredientKeys.includes("noodles")) {
      fill(7, 12, 18, 1, p.noodles);
      fill(8, 15, 16, 1, p.noodles);
    }
    if (ingredientKeys.includes("egg")) {
      fill(9, 12, 6, 6, p.egg);
      fill(11, 14, 2, 2, p.yolk);
    }
    if (ingredientKeys.includes("fishcake")) {
      fill(19, 13, 6, 6, p.fishcake);
      fill(21, 15, 2, 2, p.fishcakeDark);
    }
    canvasTexture.refresh();
  }

  createTilemapRoom() {
    const mapCols = Math.ceil(800 / MAP_TILE_SIZE);
    const mapRows = Math.ceil(600 / MAP_TILE_SIZE);
    const floorData = [];
    const objectData = [];
    const decorData = [];

    for (let row = 0; row < mapRows; row += 1) {
      const floorRow = [];
      const objectRow = [];
      const decorRow = [];
      for (let col = 0; col < mapCols; col += 1) {
        floorRow.push(1);
        objectRow.push(row === 0 || row === 1 ? 3 : -1);
        decorRow.push(-1);
      }
      floorData.push(floorRow);
      objectData.push(objectRow);
      decorData.push(decorRow);
    }

    [3, 7, 11, 15, 19].forEach((col) => (decorData[1][col] = 5));
    decorData[1][8] = 4;
    decorData[1][16] = 4;
    decorData[2][3] = 8;
    decorData[2][21] = 8;
    decorData[4][1] = 10;
    decorData[4][22] = 6;
    objectData[16][12] = 9;

    const map = this.make.tilemap({ data: floorData, tileWidth: MAP_TILE_SIZE, tileHeight: MAP_TILE_SIZE });
    const tileset = map.addTilesetImage("interior-tiles", "interior-tiles", MAP_TILE_SIZE, MAP_TILE_SIZE, 0, 0);
    this.floorLayer = map.createLayer(0, tileset, 0, 0).setDepth(0);

    const objectMap = this.make.tilemap({ data: objectData, tileWidth: MAP_TILE_SIZE, tileHeight: MAP_TILE_SIZE });
    const objectTileset = objectMap.addTilesetImage("interior-tiles", "interior-tiles", MAP_TILE_SIZE, MAP_TILE_SIZE, 0, 0);
    this.objectLayer = objectMap.createLayer(0, objectTileset, 0, 0).setDepth(1);

    const decorMap = this.make.tilemap({ data: decorData, tileWidth: MAP_TILE_SIZE, tileHeight: MAP_TILE_SIZE });
    const decorTileset = decorMap.addTilesetImage("interior-tiles", "interior-tiles", MAP_TILE_SIZE, MAP_TILE_SIZE, 0, 0);
    this.decorLayer = decorMap.createLayer(0, decorTileset, 0, 0).setDepth(2);

    this.shopSign = this.add.text(208, 74, "Neko Noodle House", {
      fontFamily: "Trebuchet MS",
      fontSize: "18px",
      color: "#fff2d8"
    }).setOrigin(0.5).setDepth(3);
    this.doorLabel = this.add.text(400, 554, "Door", {
      fontFamily: "Trebuchet MS",
      fontSize: "15px",
      color: "#fff2d8"
    }).setOrigin(0.5).setDepth(3);
  }

  createGrid() {
    this.layoutGrid = this.add.graphics().setDepth(2);
    this.layoutBlocked = this.add.graphics().setDepth(2);
    this.layoutSelection = this.add.graphics().setDepth(3);
    this.layoutGridZone = this.add.zone(
      GRID_BOUNDS.x + GRID_BOUNDS.width / 2,
      GRID_BOUNDS.y + GRID_BOUNDS.height / 2,
      GRID_BOUNDS.width,
      GRID_BOUNDS.height
    ).setInteractive({ useHandCursor: true }).setDepth(2);

    this.drawLayoutGrid();
  }

  drawLayoutGrid() {
    const size = GRID_CONFIG.tileSize;
    this.layoutGrid.clear();
    this.layoutGrid.lineStyle(1, 0x9d7651, 0.28);

    for (let col = 0; col <= GRID_CONFIG.cols; col += 1) {
      const x = GRID_CONFIG.originX + col * size;
      this.layoutGrid.moveTo(x, GRID_CONFIG.originY);
      this.layoutGrid.lineTo(x, GRID_CONFIG.originY + GRID_BOUNDS.height);
    }

    for (let row = 0; row <= GRID_CONFIG.rows; row += 1) {
      const y = GRID_CONFIG.originY + row * size;
      this.layoutGrid.moveTo(GRID_CONFIG.originX, y);
      this.layoutGrid.lineTo(GRID_CONFIG.originX + GRID_BOUNDS.width, y);
    }

    this.layoutGrid.strokePath();

    this.layoutBlocked.clear();
    BLOCKED_LAYOUT_TILES.forEach((tileKey) => {
      const [col, row] = tileKey.split(",").map(Number);
      const world = this.tileToWorld(col, row);
      this.layoutBlocked.fillStyle(0x85543b, 0.2);
      this.layoutBlocked.fillRect(world.x - size / 2, world.y - size / 2, size, size);
    });
  }

  createPlacedObjects() {
    this.placeableObjects = {};
    this.stationObjects = {};
    this.tableObjects = {};

    PLACEABLE_ITEMS.forEach((item) => {
      const sprite = this.add.sprite(0, 0, item.textureKey).setDepth(4);
      const label = this.add.text(0, 0, item.label, {
        fontFamily: "Trebuchet MS",
        fontSize: "13px",
        color: "#2f1c10",
        backgroundColor: "#f6e2bf",
        padding: { left: 6, right: 6, top: 2, bottom: 2 }
      }).setOrigin(0.5).setDepth(5);
      const zone = this.add.zone(0, 0, 72, 72).setDepth(4);
      this.physics.world.enable(zone);
      zone.body.setAllowGravity(false);
      zone.body.moves = false;

      const icon = item.type === "station" && STATIONS[item.stationKey].type === "ingredient"
        ? this.add.sprite(0, 0, `ingredient-${item.stationKey}`).setScale(0.95).setDepth(5)
        : null;

      this.placeableObjects[item.key] = { item, sprite, label, zone, icon };

      if (item.type === "station") {
        this.stationObjects[item.stationKey] = { item, sprite, label, zone, icon };
      } else {
        this.tableObjects[item.key] = { item, sprite, label };
      }
    });

    this.refreshPlacedObjects();
  }

  refreshPlacedObjects() {
    Object.values(this.placeableObjects).forEach((entry) => {
      const placement = this.layoutState.placements[entry.item.key];
      const world = this.tileToWorld(placement.col, placement.row);
      entry.sprite.setPosition(world.x, world.y);
      entry.label.setPosition(world.x, world.y + 40);
      entry.zone.setPosition(world.x, world.y + 12);

      if (entry.icon) {
        entry.icon.setPosition(world.x, world.y + 1);
      }
    });

    const assemblyPlacement = this.layoutState.placements.assembly;
    const counterPlacement = this.layoutState.placements.counter;
    const trashPlacement = this.layoutState.placements.trash;
    this.assemblyWorld = this.tileToWorld(assemblyPlacement.col, assemblyPlacement.row);
    this.counterWorld = this.tileToWorld(counterPlacement.col, counterPlacement.row);
    this.trashWorld = this.tileToWorld(trashPlacement.col, trashPlacement.row);

    if (this.assemblyPreview) {
      this.assemblyPreview.setPosition(this.assemblyWorld.x, this.assemblyWorld.y + 2);
    }
  }

  createAssemblyPreview() {
    this.assemblyPreview = this.add.container(0, 0).setDepth(6);
    this.assemblyPreviewBowl = this.add.sprite(0, -2, "bowl-empty");
    this.assemblyPreviewIngredients = this.add.graphics();
    this.assemblyPreview.add([this.assemblyPreviewBowl, this.assemblyPreviewIngredients]);
    this.refreshPlacedObjects();
  }

  createCharacters() {
    this.player = this.physics.add.sprite(280, 340, "cat", 0);
    this.player.setSize(18, 20).setOffset(7, 10);
    this.player.setCollideWorldBounds(true);
    this.player.depth = 7;

    this.carrySprite = this.add.sprite(this.player.x, this.player.y - 24, "ingredient-noodles");
    this.carrySprite.setVisible(false);
    this.carrySprite.depth = 8;

    this.playerShadow = this.add.ellipse(this.player.x, this.player.y + 15, 20, 8, 0x6c4532, 0.24).setDepth(6);
  }

  createAnimations() {
    this.createDirectionalAnimations("cat");
    CUSTOMER_VARIANTS.forEach((variant) => {
      this.createDirectionalAnimations(`customer-${variant.name.replace(/\s+/g, "-").toLowerCase()}`);
    });
  }

  createDirectionalAnimations(textureKey) {
    if (this.anims.exists(`${textureKey}-walk-down`)) {
      return;
    }

    const directions = [
      { name: "down", row: 0 },
      { name: "left", row: 1 },
      { name: "right", row: 2 },
      { name: "up", row: 3 }
    ];

    directions.forEach(({ name, row }) => {
      this.anims.create({
        key: `${textureKey}-walk-${name}`,
        frames: this.anims.generateFrameNumbers(textureKey, { frames: [row * 3, row * 3 + 1, row * 3 + 2] }),
        frameRate: 7,
        repeat: -1
      });
    });
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
    this.ui.moneyText = this.add.text(40, 16, "", { fontFamily: "Trebuchet MS", fontSize: "18px", color: "#fff2d8" }).setDepth(11);
    this.ui.dayText = this.add.text(180, 16, "", { fontFamily: "Trebuchet MS", fontSize: "18px", color: "#fff2d8" }).setDepth(11);
    this.ui.timerText = this.add.text(310, 16, "", { fontFamily: "Trebuchet MS", fontSize: "18px", color: "#fff2d8" }).setDepth(11);
    this.ui.carryText = this.add.text(500, 16, "", { fontFamily: "Trebuchet MS", fontSize: "16px", color: "#ffe6c1" }).setDepth(11);
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

    this.ui.assemblyText = this.add.text(0, 0, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "15px",
      color: "#2f1c10",
      backgroundColor: "#fff0d0",
      padding: { left: 8, right: 8, top: 4, bottom: 4 }
    }).setOrigin(0.5).setDepth(8);

    this.createLayoutUi();
    this.createUpgradeOverlay();

    this.setMessage(UI_TEXT.intro);
    this.updateUi();
  }

  createLayoutUi() {
    this.ui.layoutPanel = this.add.rectangle(684, 312, 192, 348, 0xffefcf, 0.96).setStrokeStyle(5, 0xa76542, 0.6).setDepth(12);
    this.ui.layoutTitle = this.add.text(684, 154, "Layout", {
      fontFamily: "Trebuchet MS",
      fontSize: "24px",
      color: "#5a3421"
    }).setOrigin(0.5).setDepth(13);
    this.ui.layoutHint = this.add.text(684, 184, "Pick an item,\nthen click the grid.", {
      fontFamily: "Trebuchet MS",
      fontSize: "14px",
      color: "#8c4a2f",
      align: "center"
    }).setOrigin(0.5).setDepth(13);

    this.ui.layoutButtons = PLACEABLE_ITEMS.map((item, index) => {
      const y = 224 + index * 26;
      const button = this.add.rectangle(684, y, 164, 22, 0xf2dcc0, 1).setDepth(12);
      const label = this.add.text(684, y, item.label, {
        fontFamily: "Trebuchet MS",
        fontSize: "14px",
        color: "#5a3421"
      }).setOrigin(0.5).setDepth(13);
      this.makeInteractiveButton(button, label, () => this.selectLayoutItem(item.key));
      return { key: item.key, button, label };
    });

    this.ui.layoutStartButton = this.add.rectangle(684, 448, 148, 38, 0xb8744a, 1).setStrokeStyle(4, 0x8c4a2f, 0.8).setDepth(12);
    this.ui.layoutStartLabel = this.add.text(684, 448, "Start Day", {
      fontFamily: "Trebuchet MS",
      fontSize: "18px",
      color: "#fff7e9"
    }).setOrigin(0.5).setDepth(13);
    this.makeInteractiveButton(this.ui.layoutStartButton, this.ui.layoutStartLabel, () => this.startServiceDay());
  }

  createUpgradeOverlay() {
    this.ui.endOverlay = this.add.container(0, 0).setDepth(20).setVisible(false);
    const overlayBg = this.add.rectangle(400, 300, 800, 600, 0x2b1d14, 0.64);
    const overlayPanel = this.add.rectangle(END_OVERLAY_LAYOUT.panelX, END_OVERLAY_LAYOUT.panelY, 580, 430, 0xffefcf, 0.96)
      .setStrokeStyle(6, 0xa76542, 0.65);
    const overlayTitle = this.add.text(400, END_OVERLAY_LAYOUT.titleY, "Day Complete", {
      fontFamily: "Trebuchet MS",
      fontSize: "30px",
      color: "#522f1d"
    }).setOrigin(0.5);

    this.ui.endMoneyText = this.add.text(400, END_OVERLAY_LAYOUT.moneyY, "", { fontFamily: "Trebuchet MS", fontSize: "22px", color: "#8c4a2f" }).setOrigin(0.5);
    this.ui.endServedText = this.add.text(400, END_OVERLAY_LAYOUT.servedY, "", { fontFamily: "Trebuchet MS", fontSize: "19px", color: "#5a3421" }).setOrigin(0.5);
    this.ui.endMistakesText = this.add.text(400, END_OVERLAY_LAYOUT.mistakesY, "", { fontFamily: "Trebuchet MS", fontSize: "19px", color: "#5a3421" }).setOrigin(0.5);
    this.ui.endBankText = this.add.text(400, END_OVERLAY_LAYOUT.bankY, "", { fontFamily: "Trebuchet MS", fontSize: "18px", color: "#8c4a2f" }).setOrigin(0.5);
    this.ui.upgradeHeaderText = this.add.text(400, END_OVERLAY_LAYOUT.headerY, "Upgrades", { fontFamily: "Trebuchet MS", fontSize: "22px", color: "#522f1d" }).setOrigin(0.5);

    this.ui.upgradeRows = UPGRADE_DEFS.map((upgrade, index) => {
      const rowY = END_OVERLAY_LAYOUT.firstRowY + index * UPGRADE_ROW_STEP;
      const text = this.add.text(400, rowY, "", { fontFamily: "Trebuchet MS", fontSize: "15px", color: "#5a3421", align: "center" }).setOrigin(0.5);
      const barBg = this.add.rectangle(400, rowY + 18, UPGRADE_BAR_WIDTH, 12, 0xd9c3a4).setStrokeStyle(2, 0xa76542, 0.4);
      const barFill = this.add.rectangle(276, rowY + 18, 0, 8, 0xb8744a).setOrigin(0, 0.5);
      const levelText = this.add.text(534, rowY + 18, "", { fontFamily: "Trebuchet MS", fontSize: "14px", color: "#7b4f35" }).setOrigin(1, 0.5);
      const hitArea = this.add.rectangle(400, rowY + 10, 380, 38, 0xffffff, 0.001);
      this.makeInteractiveButton(hitArea, text, () => this.purchaseUpgrade(upgrade.key));
      return { key: upgrade.key, text, barBg, barFill, levelText, hitArea };
    });

    this.ui.nextDayButton = this.add.rectangle(400, END_OVERLAY_LAYOUT.nextDayButtonY, 240, 40, 0xb8744a, 1).setStrokeStyle(4, 0x8c4a2f, 0.8);
    this.ui.nextDayButtonLabel = this.add.text(400, END_OVERLAY_LAYOUT.nextDayButtonY, "Layout Next Day", {
      fontFamily: "Trebuchet MS",
      fontSize: "18px",
      color: "#fff7e9"
    }).setOrigin(0.5);
    this.makeInteractiveButton(this.ui.nextDayButton, this.ui.nextDayButtonLabel, () => this.startNextDay());

    const overlayHint = this.add.text(400, END_OVERLAY_LAYOUT.hintY, "Press 1-3 to buy upgrades, or click a row. Enter continues.", {
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
  }

  createStartOverlay() {
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
    this.ui.startButtonLabel = this.add.text(400, 388, "Plan Layout", {
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
    this.tweens.add({ targets: startSteam1, y: "-=16", alpha: 0.05, duration: 1800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: startSteam2, y: "-=20", alpha: 0.04, duration: 2300, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  makeInteractiveButton(target, label, handler) {
    target.setInteractive({ useHandCursor: true });
    target.on("pointerdown", handler);
    target.on("pointerover", () => {
      target.setAlpha(0.88);
      if (label?.setScale) label.setScale(1.02);
    });
    target.on("pointerout", () => {
      target.setAlpha(1);
      if (label?.setScale) label.setScale(1);
    });
  }

  bindLayoutPlacement() {
    this.layoutGridZone.on("pointerdown", (pointer) => {
      if (this.phase !== "layout") {
        return;
      }

      const tile = this.pointerToTile(pointer);
      if (!tile) {
        return;
      }

      this.tryPlaceSelectedItem(tile.col, tile.row);
    });
  }

  enterTitlePhase() {
    this.phase = "title";
    this.setSceneVisibility({ gameplay: false, layout: false, title: true, upgrade: false, player: false });
    this.setMessage(UI_TEXT.welcome);
    this.updateUi();
  }

  enterLayoutPhase() {
    this.phase = "layout";
    this.resetDayState();
    this.setSceneVisibility({ gameplay: true, layout: true, title: false, upgrade: false, player: false });
    this.refreshPlacedObjects();
    this.updateAssemblyPreview();
    this.selectLayoutItem(this.selectedLayoutItemKey);
    this.setMessage(UI_TEXT.layoutPrompt);
    this.updateUi();
  }

  startServiceDay() {
    if (!this.hasRequiredLayout()) {
      this.setMessage(UI_TEXT.needTable);
      return;
    }

    this.phase = "service";
    this.setSceneVisibility({ gameplay: true, layout: false, title: false, upgrade: false, player: true });
    this.player.setPosition(280, 340);
    this.playerShadow.setPosition(this.player.x, this.player.y + 15);
    this.syncCarryVisual();
    this.updateAssemblyPreview();
    this.scheduleNextOrderingCustomer(ORDER_SPAWN_DELAY);
    this.setMessage(UI_TEXT.serviceStart);
    this.updateUi();
  }

  enterUpgradePhase() {
    this.phase = "upgrade";
    this.clearOrderingCustomer();
    this.clearDiningCustomers();
    this.playerState = this.createEmptyPlayerState();
    this.assemblyState = this.createEmptyAssemblyState();
    this.syncCarryVisual();
    this.updateAssemblyPreview();
    this.refreshUpgradeUi();
    this.ui.endMoneyText.setText(`Money earned: $${this.dayEarnings}`);
    this.ui.endServedText.setText(`Customers served: ${this.customersServed}`);
    this.ui.endMistakesText.setText(`Mistakes made: ${this.mistakesMade}`);
    this.ui.endOverlay.setVisible(true);
    this.setSceneVisibility({ gameplay: true, layout: false, title: false, upgrade: true, player: false });
    this.setMessage("Shift ended.");
  }

  setSceneVisibility({ gameplay, layout, title, upgrade, player }) {
    this.ui.topPanel.setVisible(gameplay);
    this.ui.moneyText.setVisible(gameplay);
    this.ui.dayText.setVisible(gameplay);
    this.ui.timerText.setVisible(gameplay);
    this.ui.carryText.setVisible(gameplay);
    this.ui.taskText.setVisible(gameplay);
    this.ui.messagePanel.setVisible(gameplay);
    this.ui.messageText.setVisible(gameplay);
    this.ui.assemblyText.setVisible(gameplay);
    this.assemblyPreview.setVisible(gameplay);
    this.layoutGrid.setVisible(layout);
    this.layoutBlocked.setVisible(layout);
    this.layoutSelection.setVisible(layout);
    this.layoutGridZone.setVisible(layout);
    this.layoutGridZone.input.enabled = layout;
    this.player.setVisible(player);
    this.playerShadow.setVisible(player);
    this.carrySprite.setVisible(player && Boolean(this.playerState.holding));

    Object.values(this.placeableObjects).forEach((entry) => {
      entry.sprite.setVisible(gameplay);
      entry.label.setVisible(gameplay);
      entry.zone.setActive(player);
      entry.zone.body.enable = player;
      if (entry.icon) {
        entry.icon.setVisible(gameplay);
      }
    });

    [
      this.ui.layoutPanel,
      this.ui.layoutTitle,
      this.ui.layoutHint,
      this.ui.layoutStartButton,
      this.ui.layoutStartLabel
    ].forEach((item) => item.setVisible(layout));
    this.ui.layoutButtons.forEach((button) => {
      button.button.setVisible(layout);
      button.label.setVisible(layout);
    });

    this.ui.startOverlay.setVisible(title);
    this.ui.endOverlay.setVisible(upgrade);
  }

  handleTitleInput() {
    const startPressed =
      Phaser.Input.Keyboard.JustDown(this.interactKey.start) ||
      Phaser.Input.Keyboard.JustDown(this.interactKey.primary) ||
      Phaser.Input.Keyboard.JustDown(this.interactKey.alternate);

    if (startPressed) {
      this.startGame();
    }
  }

  startGame() {
    this.gameStarted = true;
    this.enterLayoutPhase();
  }

  handleUpgradeInput() {
    if (Phaser.Input.Keyboard.JustDown(this.upgradeKeys.one)) this.purchaseUpgrade("movement");
    if (Phaser.Input.Keyboard.JustDown(this.upgradeKeys.two)) this.purchaseUpgrade("patience");
    if (Phaser.Input.Keyboard.JustDown(this.upgradeKeys.three)) this.purchaseUpgrade("tips");
    if (Phaser.Input.Keyboard.JustDown(this.interactKey.start)) this.startNextDay();
  }

  startNextDay() {
    this.dayNumber += 1;
    this.ui.endOverlay.setVisible(false);
    this.enterLayoutPhase();
    this.setMessage(`Day ${this.dayNumber}: adjust the room, then start service.`);
  }

  selectLayoutItem(itemKey) {
    this.selectedLayoutItemKey = itemKey;
    this.drawLayoutSelection();

    this.ui.layoutButtons.forEach((button) => {
      const selected = button.key === itemKey;
      button.button.setFillStyle(selected ? 0xb8744a : 0xf2dcc0, 1);
      button.label.setColor(selected ? "#fff7e9" : "#5a3421");
    });
  }

  drawLayoutSelection() {
    this.layoutSelection.clear();
    const placement = this.layoutState.placements[this.selectedLayoutItemKey];
    const world = this.tileToWorld(placement.col, placement.row);
    const size = GRID_CONFIG.tileSize;
    this.layoutSelection.lineStyle(3, 0xb65234, 0.9);
    this.layoutSelection.strokeRect(world.x - size / 2 + 4, world.y - size / 2 + 4, size - 8, size - 8);
  }

  tryPlaceSelectedItem(col, row) {
    if (!this.canPlaceItem(this.selectedLayoutItemKey, col, row)) {
      this.setMessage("That spot is blocked or already occupied.");
      return;
    }

    this.layoutState.placements[this.selectedLayoutItemKey] = { col, row };
    this.refreshPlacedObjects();
    this.drawLayoutSelection();
    this.setMessage(`${PLACEABLE_BY_KEY[this.selectedLayoutItemKey].label} moved.`);
  }

  canPlaceItem(itemKey, col, row) {
    if (col < 0 || row < 0 || col >= GRID_CONFIG.cols || row >= GRID_CONFIG.rows) {
      return false;
    }

    if (BLOCKED_TILE_SET.has(`${col},${row}`)) {
      return false;
    }

    return !Object.entries(this.layoutState.placements).some(([placedKey, placement]) => {
      if (placedKey === itemKey) {
        return false;
      }

      return placement.col === col && placement.row === row;
    });
  }

  pointerToTile(pointer) {
    const localX = pointer.worldX - GRID_CONFIG.originX;
    const localY = pointer.worldY - GRID_CONFIG.originY;
    const col = Math.floor(localX / GRID_CONFIG.tileSize);
    const row = Math.floor(localY / GRID_CONFIG.tileSize);

    if (col < 0 || row < 0 || col >= GRID_CONFIG.cols || row >= GRID_CONFIG.rows) {
      return null;
    }

    return { col, row };
  }

  tileToWorld(col, row) {
    return {
      x: GRID_CONFIG.originX + col * GRID_CONFIG.tileSize + GRID_CONFIG.tileSize / 2,
      y: GRID_CONFIG.originY + row * GRID_CONFIG.tileSize + GRID_CONFIG.tileSize / 2
    };
  }

  hasRequiredLayout() {
    const hasStations = STATION_ITEMS.every((item) => Boolean(this.layoutState.placements[item.key]));
    return hasStations && TABLE_ITEMS.length > 0;
  }

  updateDayTimer(delta) {
    this.dayTimeLeft = Math.max(0, this.dayTimeLeft - delta / 1000);
    if (this.dayTimeLeft === 0) {
      this.enterUpgradePhase();
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
    this.playCharacterAnimation(this.player, "cat", velocityX, velocityY);

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

  playCharacterAnimation(sprite, textureKey, velocityX, velocityY) {
    const moving = velocityX !== 0 || velocityY !== 0;
    let direction = "down";

    if (Math.abs(velocityX) > Math.abs(velocityY)) {
      direction = velocityX < 0 ? "left" : "right";
    } else if (velocityY !== 0) {
      direction = velocityY < 0 ? "up" : "down";
    }

    sprite.facing = direction;

    if (moving) {
      sprite.play(`${textureKey}-walk-${direction}`, true);
    } else {
      sprite.anims.stop();
      const idleRow = { down: 0, left: 1, right: 2, up: 3 }[sprite.facing || "down"];
      sprite.setFrame(idleRow * 3 + 1);
    }
  }

  updateOrderingCustomer(delta) {
    if (!this.orderCustomer) {
      return;
    }

    const customer = this.orderCustomer;
    if (customer.state === "waiting") {
      customer.patience = Math.max(0, customer.patience - (delta / 1000) * customer.patienceLossRate);
    }

    this.drawPatienceBar(customer);
    this.drawOrderBubble(customer);
    this.updateCustomerMood(customer, delta);

    if (customer.state === "arriving") {
      const target = { x: this.counterWorld.x, y: this.counterWorld.y + 70 };
      this.moveActorTowards(customer.sprite, target, CUSTOMER_SPEED);
      this.playCharacterAnimation(customer.sprite, customer.sprite.texture.key, customer.sprite.body.velocity.x, customer.sprite.body.velocity.y);
      if (Phaser.Math.Distance.Between(customer.sprite.x, customer.sprite.y, target.x, target.y) < 6) {
        customer.sprite.body.setVelocity(0, 0);
        this.playCharacterAnimation(customer.sprite, customer.sprite.texture.key, 0, 0);
        customer.state = "waiting";
        customer.moodText.setText("...");
        this.setMessage(`${customer.name} ordered ${RECIPES[customer.orderKey].label}.`);
      }
    }

    if (customer.patience <= 0 && customer.state !== "leaving") {
      this.failOrderingCustomer();
    }
  }

  updateDiningCustomers(delta) {
    this.diningCustomers = this.diningCustomers.filter((customer) => {
      this.updateCustomerMood(customer, delta);

      if (customer.state === "toTable") {
        const tableWorld = this.getTableSeatWorld(customer.tableKey);
        this.moveActorTowards(customer.sprite, tableWorld, CUSTOMER_SPEED - 6);
        this.playCharacterAnimation(customer.sprite, customer.sprite.texture.key, customer.sprite.body.velocity.x, customer.sprite.body.velocity.y);
        if (Phaser.Math.Distance.Between(customer.sprite.x, customer.sprite.y, tableWorld.x, tableWorld.y) < 8) {
          customer.sprite.body.setVelocity(0, 0);
          this.playCharacterAnimation(customer.sprite, customer.sprite.texture.key, 0, 0);
          customer.state = "eating";
          customer.eatTimeLeft = DINING_DURATION_SECONDS;
          customer.moodText.setText("yum");
        }
        return true;
      }

      if (customer.state === "eating") {
        customer.eatTimeLeft -= delta / 1000;
        if (customer.eatTimeLeft <= 0) {
          customer.state = "leaving";
          customer.moodText.setText("bye");
          this.freeTable(customer.tableKey);
        }
        return true;
      }

      if (customer.state === "leaving") {
        this.moveActorTowards(customer.sprite, { x: 400, y: 640 }, CUSTOMER_SPEED + 10);
        this.playCharacterAnimation(customer.sprite, customer.sprite.texture.key, customer.sprite.body.velocity.x, customer.sprite.body.velocity.y);
        if (customer.sprite.y > 610) {
          this.destroyCustomerEntity(customer);
          return false;
        }
      }

      return true;
    });

    if (!this.orderCustomer && this.hasAvailableTable()) {
      this.scheduleNextOrderingCustomer(1200);
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

    Object.entries(this.stationObjects).forEach(([stationKey, station]) => {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, station.zone.x, station.zone.y);
      if (distance <= 56 && (!match || distance < match.distance)) {
        match = { key: stationKey, ...station, distance };
      }
    });

    return match;
  }

  processStationInteraction(station) {
    const stationType = STATIONS[station.item.stationKey].type;
    this.pulseStation(station.item.key);

    if (stationType === "ingredient") return this.pickUpIngredient(station.item.stationKey);
    if (stationType === "assembly") return this.interactWithAssembly();
    if (stationType === "counter") return this.serveDish();
    if (stationType === "trash") return this.discardHeldItem();
  }

  pulseStation(itemKey) {
    const station = this.placeableObjects[itemKey];
    this.tweens.killTweensOf(station.sprite);
    this.tweens.add({
      targets: station.sprite,
      scaleX: 1.03,
      scaleY: 1.06,
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

    if (holding?.type === "ingredient") return this.addIngredientToAssembly(holding.key);
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

    this.playerState.holding = { type: "bowl", recipeKey: recipe.key };
    this.assemblyState = this.createEmptyAssemblyState();
    this.syncCarryVisual();
    this.updateAssemblyPreview();
    this.bounceCarrySprite();
    this.setMessage(`${recipe.label} is ready to serve.`);
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
    this.setMessage(recipe ? `${recipe.label} is complete. Interact again to pick it up.` : `Added ${INGREDIENTS[ingredientKey].label.toLowerCase()} to the bowl.`);
  }

  canIngredientBeAdded(ingredientKey) {
    const current = this.assemblyState.ingredients;
    if (current.length === 0) return ingredientKey === "noodles";
    if (current.length === 1) return current[0] === "noodles" && ingredientKey === "broth";
    if (current.length === 2) return ["egg", "fishcake"].includes(ingredientKey);
    return false;
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

  serveDish() {
    if (!this.orderCustomer || this.orderCustomer.state !== "waiting") {
      this.setMessage("Nobody is waiting at the counter.");
      return;
    }

    const holding = this.playerState.holding;
    if (!holding || holding.type !== "bowl") {
      this.setMessage("You need a finished bowl to serve.");
      return;
    }

    if (holding.recipeKey !== this.orderCustomer.orderKey) {
      const servedLabel = RECIPES[holding.recipeKey].label;
      this.playerState.holding = null;
      this.syncCarryVisual();
      this.orderCustomer.patience = Math.max(0, this.orderCustomer.patience - 28);
      this.mistakesMade += 1;
      this.flashCustomerMood(this.orderCustomer, "!?");
      this.setMessage(`${servedLabel} was the wrong order. The customer is less patient now.`);
      return;
    }

    const tableKey = this.getAvailableTableKey();
    if (!tableKey) {
      this.setMessage("There is no open table right now.");
      return;
    }

    const recipe = RECIPES[this.orderCustomer.orderKey];
    const tip = this.calculateTipBonus(this.orderCustomer);
    const reward = recipe.reward + tip;
    const customer = this.orderCustomer;

    this.money += reward;
    this.bankMoney += reward;
    this.dayEarnings += reward;
    this.customersServed += 1;
    this.playerState.holding = null;
    this.syncCarryVisual();

    customer.state = "toTable";
    customer.tableKey = tableKey;
    customer.orderBubble.destroy();
    customer.patienceBar.destroy();
    customer.orderBubble = null;
    customer.patienceBar = null;
    this.occupyTable(tableKey, customer.name);
    this.diningCustomers.push(customer);
    this.orderCustomer = null;

    this.scheduleNextOrderingCustomer(ORDER_SPAWN_DELAY);
    this.setMessage(tip > 0 ? `${customer.name} loved the quick service. Earned $${recipe.reward} + $${tip} tip.` : `${customer.name} is happy. They found a table.`);
  }

  calculateTipBonus(customer) {
    const patienceRatio = customer.patience / MAX_PATIENCE;
    if (patienceRatio < 0.55) {
      return 0;
    }
    return Math.max(1, Math.round(MAX_TIP * patienceRatio * this.getTipMultiplier()));
  }

  scheduleNextOrderingCustomer(delay) {
    if (this.orderSpawnPending) {
      return;
    }

    this.orderSpawnPending = true;
    this.time.delayedCall(delay, () => {
      this.orderSpawnPending = false;
      if (this.phase === "service" && !this.orderCustomer && this.hasAvailableTable()) {
        this.spawnOrderingCustomer();
      }
    });
  }

  spawnOrderingCustomer() {
    if (this.orderCustomer || !this.hasAvailableTable()) {
      return;
    }

    this.orderSpawnPending = false;
    const variant = Phaser.Utils.Array.GetRandom(CUSTOMER_VARIANTS);
    const recipe = Phaser.Utils.Array.GetRandom(RECIPE_LIST);
    this.orderCustomer = this.createCustomerEntity(variant, recipe);
    this.setMessage(`${variant.name} entered the noodle house.`);
  }

  createCustomerEntity(variant, recipe) {
    const textureKey = `customer-${variant.name.replace(/\s+/g, "-").toLowerCase()}`;

    if (!this.textures.exists(textureKey)) {
      this.makeCharacterTexture(textureKey, variant.tint, variant.shirt, 0xf9eee2, "human");
    }

    const sprite = this.physics.add.sprite(400, 624, textureKey, 1);
    sprite.setSize(18, 20).setOffset(7, 10);
    sprite.setCollideWorldBounds(false);
    sprite.depth = 7;

    const shadow = this.add.ellipse(sprite.x, sprite.y + 15, 18, 8, 0x6c4532, 0.24).setDepth(6);
    const patienceBar = this.add.graphics().setDepth(8);
    const orderBubble = this.add.container(0, 0).setDepth(9);
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
    }).setOrigin(0.5).setDepth(9);

    return {
      name: variant.name,
      orderKey: recipe.key,
      sprite,
      shadow,
      moodText,
      patienceBar,
      orderBubble,
      orderBubbleBackground,
      patience: MAX_PATIENCE,
      patienceLossRate: Phaser.Math.FloatBetween(7, 10) * this.getPatienceDecayMultiplier(),
      state: "arriving",
      tableKey: null,
      eatTimeLeft: 0
    };
  }

  updateCustomerMood(customer, delta) {
    customer.animTick = (customer.animTick || 0) + delta;
    customer.shadow.setPosition(customer.sprite.x, customer.sprite.y + 15);
    customer.moodText.setPosition(customer.sprite.x, customer.sprite.y - 50);
    if (customer.orderBubble) customer.orderBubble.setPosition(customer.sprite.x, customer.sprite.y - 76);

    if (customer.state === "eating") {
      customer.moodText.setText("yum");
      customer.moodText.setColor("#7b4f35");
      return;
    }

    if (customer.state === "toTable") {
      customer.moodText.setText("...");
      customer.moodText.setColor("#5b3922");
      return;
    }

    const ratio = customer.patience / MAX_PATIENCE;
    if (ratio < 0.3 && customer.state === "waiting") {
      customer.moodText.setText("hmph");
      customer.moodText.setColor("#a04c34");
    } else {
      customer.moodText.setText("...");
      customer.moodText.setColor("#5b3922");
    }
  }

  drawPatienceBar(customer) {
    if (!customer.patienceBar) {
      return;
    }

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
    if (!customer.orderBubble) {
      return;
    }

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
      onComplete: () => customer.moodText.active && customer.moodText.setAlpha(1)
    });
  }

  failOrderingCustomer() {
    if (!this.orderCustomer) {
      return;
    }

    const customer = this.orderCustomer;
    this.flashCustomerMood(customer, "hmph");
    customer.state = "leaving";
    customer.sprite.body.setVelocity(0, 0);
    this.diningCustomers.push(customer);
    this.orderCustomer = null;
    this.freeAnyReservedTable(customer.tableKey);
    customer.tableKey = null;
    if (customer.orderBubble) customer.orderBubble.destroy();
    if (customer.patienceBar) customer.patienceBar.destroy();
    customer.orderBubble = null;
    customer.patienceBar = null;
    this.scheduleCustomerExit(customer);
    this.setMessage(`${customer.name} ran out of patience and left.`);
  }

  scheduleCustomerExit(customer) {
    customer.state = "leaving";
  }

  getAvailableTableKey() {
    return TABLE_ITEMS.find((item) => !this.tableStates[item.key].occupiedBy)?.key || null;
  }

  hasAvailableTable() {
    return Boolean(this.getAvailableTableKey());
  }

  occupyTable(tableKey, occupantName) {
    if (tableKey) this.tableStates[tableKey].occupiedBy = occupantName;
  }

  freeTable(tableKey) {
    if (tableKey && this.tableStates[tableKey]) {
      this.tableStates[tableKey].occupiedBy = null;
    }
  }

  freeAnyReservedTable(tableKey) {
    this.freeTable(tableKey);
  }

  getTableSeatWorld(tableKey) {
    const placement = this.layoutState.placements[tableKey];
    return this.tileToWorld(placement.col, placement.row);
  }

  destroyCustomerEntity(customer) {
    if (customer.patienceBar) customer.patienceBar.destroy();
    if (customer.orderBubble) customer.orderBubble.destroy();
    customer.shadow.destroy();
    customer.moodText.destroy();
    customer.sprite.destroy();
  }

  clearOrderingCustomer() {
    if (!this.orderCustomer) {
      return;
    }

    this.destroyCustomerEntity(this.orderCustomer);
    this.orderCustomer = null;
  }

  clearDiningCustomers() {
    this.diningCustomers.forEach((customer) => this.destroyCustomerEntity(customer));
    this.diningCustomers = [];
  }

  bounceCarrySprite() {
    if (!this.carrySprite.visible) return;
    this.tweens.killTweensOf(this.carrySprite);
    this.carrySprite.setScale(1);
    this.tweens.add({ targets: this.carrySprite, scaleX: 1.18, scaleY: 1.18, y: this.carrySprite.y - 5, duration: 110, yoyo: true, ease: "Back.easeOut" });
  }

  bounceAssemblyPreview() {
    this.tweens.killTweensOf(this.assemblyPreview);
    this.tweens.add({ targets: this.assemblyPreview, y: this.assemblyPreview.y - 5, duration: 120, yoyo: true, ease: "Quad.easeOut" });
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
    this.ui.assemblyText.setPosition(this.assemblyWorld.x, this.assemblyWorld.y + 74);
    this.ui.assemblyText.setText(`Assembly: ${this.getAssemblyLabel()}`);
  }

  getCarryLabel() {
    const holding = this.playerState.holding;
    if (!holding) return "empty";
    if (holding.type === "ingredient") return INGREDIENTS[holding.key].label;
    return RECIPES[holding.recipeKey].shortLabel;
  }

  getTaskText() {
    if (this.phase === "layout") {
      return "Task: Plan room";
    }

    const holding = this.playerState.holding;
    if (holding?.type === "ingredient") return "Task: Add to bowl";
    if (holding?.type === "bowl") return "Task: Serve order";
    if (this.getRecipeForIngredients(this.assemblyState.ingredients)) return "Task: Pick up bowl";
    if (this.assemblyState.ingredients.length > 0) return "Task: Finish recipe";
    if (this.orderCustomer?.state === "waiting") return `Task: ${RECIPES[this.orderCustomer.orderKey].shortLabel}`;
    return "Task: Await guest";
  }

  getAssemblyLabel() {
    if (this.assemblyState.ingredients.length === 0) return "empty bowl";
    const recipe = this.getRecipeForIngredients(this.assemblyState.ingredients);
    return recipe ? `${recipe.shortLabel} ready` : this.assemblyState.ingredients.map((key) => INGREDIENTS[key].label).join(" + ");
  }

  updateAssemblyPreview() {
    const ingredients = this.assemblyState.ingredients;
    const recipe = this.getRecipeForIngredients(ingredients);
    this.assemblyPreviewBowl.setTexture(recipe ? `bowl-${recipe.key}` : "bowl-empty");
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
    if (!holding || this.phase !== "service") {
      this.carrySprite.setVisible(false);
      return;
    }

    const textureKey = holding.type === "ingredient" ? `ingredient-${holding.key}` : `bowl-${holding.recipeKey}`;
    this.carrySprite.setTexture(textureKey);
    this.carrySprite.setVisible(true);
  }

  getRecipeForIngredients(ingredientKeys) {
    const normalized = [...ingredientKeys];
    this.sortIngredients(normalized);
    return RECIPE_LIST.find((recipe) => recipe.ingredients.length === normalized.length && recipe.ingredients.every((ingredient, index) => ingredient === normalized[index])) || null;
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
    return definition.baseCost + definition.costStep * this.upgrades[upgradeKey];
  }

  purchaseUpgrade(upgradeKey) {
    if (this.phase !== "upgrade") {
      return;
    }

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
    UPGRADE_DEFS.forEach((upgrade, index) => {
      const level = this.upgrades[upgrade.key];
      const isMaxed = level >= upgrade.maxLevel;
      const row = this.ui.upgradeRows[index];
      row.text.setText(`${index + 1}. ${upgrade.label}  ${upgrade.description}  ${isMaxed ? "MAX" : `$${this.getUpgradeCost(upgrade.key)}`}`);
      row.text.setColor(isMaxed ? "#8a7b68" : "#5a3421");
      row.barFill.width = UPGRADE_BAR_WIDTH * (level / upgrade.maxLevel);
      row.barFill.setFillStyle(isMaxed ? 0x8a7b68 : 0xb8744a, 1);
      row.levelText.setText(`Lv ${level}/${upgrade.maxLevel}`);
    });

    this.ui.endBankText.setText(`Bank after shift: $${this.bankMoney}`);
  }
}
