export const DAY_LENGTH_SECONDS = 90;
export const PLAYER_SPEED = 160;
export const CUSTOMER_SPEED = 70;
export const MAX_PATIENCE = 100;
export const BASE_BOWL_REWARD = 12;
export const MAX_TIP = 6;
export const DAY_TIME_INCREMENT = 5;
export const DINING_DURATION_SECONDS = 6;

export const PIXEL_PALETTE = {
  outline: "#3c2a1f",
  shadow: "#5a4030",
  woodDark: "#6f4a32",
  woodMid: "#8f6140",
  woodLight: "#b07d55",
  floorA: "#cda47a",
  floorB: "#d4ad86",
  wall: "#e7d3af",
  wallShade: "#d2ba90",
  paper: "#f4e7c8",
  plant: "#6f8f4f",
  plantDark: "#4d6a37",
  brass: "#d0a24d",
  lantern: "#f7d88a",
  clothBlue: "#6c8aa6",
  clothRed: "#b45e4c",
  clothGreen: "#7d9a62",
  bowl: "#efe2cb",
  broth: "#c97b45",
  noodles: "#efd27b",
  egg: "#f5efcf",
  yolk: "#dfaf45",
  fishcake: "#e6b2c8",
  fishcakeDark: "#c97a9a",
  steel: "#9ea4a3",
  counterTop: "#d3b289"
};

export const GRID_CONFIG = {
  originX: 112,
  originY: 128,
  tileSize: 64,
  cols: 9,
  rows: 6
};

// Blocked cells preserve walls, the front door lane, and a simple walkway through the room.
export const BLOCKED_LAYOUT_TILES = [
  "0,0",
  "1,0",
  "2,0",
  "3,0",
  "4,0",
  "5,0",
  "6,0",
  "7,0",
  "8,0",
  "3,4",
  "4,4",
  "5,4",
  "4,5"
];

export const INGREDIENTS = {
  noodles: {
    key: "noodles",
    label: "Noodles",
    color: 0xf1d488,
    accent: 0xd39a2f,
    stationX: 132,
    stationY: 140
  },
  broth: {
    key: "broth",
    label: "Broth",
    color: 0xd98f61,
    accent: 0xa65934,
    stationX: 248,
    stationY: 140
  },
  egg: {
    key: "egg",
    label: "Egg",
    color: 0xf7f1d0,
    accent: 0xe0b44b,
    stationX: 364,
    stationY: 140
  },
  fishcake: {
    key: "fishcake",
    label: "Fishcake",
    color: 0xf3c7d7,
    accent: 0xd3729d,
    stationX: 480,
    stationY: 140
  }
};

export const STATIONS = {
  noodles: { key: "noodles", type: "ingredient", label: "Noodles", x: 132, y: 140, color: 0xf1d488 },
  broth: { key: "broth", type: "ingredient", label: "Broth", x: 248, y: 140, color: 0xd98f61 },
  egg: { key: "egg", type: "ingredient", label: "Egg", x: 364, y: 140, color: 0xf7f1d0 },
  fishcake: { key: "fishcake", type: "ingredient", label: "Fishcake", x: 480, y: 140, color: 0xf3c7d7 },
  assembly: { key: "assembly", type: "assembly", label: "Assembly", x: 610, y: 140, color: 0xa8c686 },
  counter: { key: "counter", type: "counter", label: "Counter", x: 610, y: 258, color: 0xc56a45 },
  trash: { key: "trash", type: "trash", label: "Trash", x: 130, y: 258, color: 0x8f8b86 }
};

export const PLACEABLE_ITEMS = [
  { key: "noodles", type: "station", stationKey: "noodles", label: "Noodles", textureKey: "station-noodles", tile: { col: 0, row: 1 } },
  { key: "broth", type: "station", stationKey: "broth", label: "Broth", textureKey: "station-broth", tile: { col: 1, row: 1 } },
  { key: "egg", type: "station", stationKey: "egg", label: "Egg", textureKey: "station-egg", tile: { col: 2, row: 1 } },
  { key: "fishcake", type: "station", stationKey: "fishcake", label: "Fishcake", textureKey: "station-fishcake", tile: { col: 3, row: 1 } },
  { key: "assembly", type: "station", stationKey: "assembly", label: "Assembly", textureKey: "station-assembly", tile: { col: 7, row: 1 } },
  { key: "counter", type: "station", stationKey: "counter", label: "Counter", textureKey: "station-counter", tile: { col: 7, row: 3 } },
  { key: "trash", type: "station", stationKey: "trash", label: "Trash", textureKey: "station-trash", tile: { col: 0, row: 3 } },
  { key: "tableA", type: "table", label: "Table A", textureKey: "table", tile: { col: 2, row: 3 } },
  { key: "tableB", type: "table", label: "Table B", textureKey: "table", tile: { col: 6, row: 3 } }
];

// Recipes are data-driven so new bowls can be added without changing the loop.
export const RECIPES = {
  basicRamen: {
    key: "basicRamen",
    label: "Basic Ramen",
    shortLabel: "Basic",
    ingredients: ["noodles", "broth"],
    reward: BASE_BOWL_REWARD,
    color: 0xf0bf68
  },
  eggRamen: {
    key: "eggRamen",
    label: "Egg Ramen",
    shortLabel: "Egg",
    ingredients: ["noodles", "broth", "egg"],
    reward: BASE_BOWL_REWARD + 2,
    color: 0xf2df92
  },
  fishcakeRamen: {
    key: "fishcakeRamen",
    label: "Fishcake Ramen",
    shortLabel: "Fishcake",
    ingredients: ["noodles", "broth", "fishcake"],
    reward: BASE_BOWL_REWARD + 2,
    color: 0xf1b8d0
  }
};

export const CUSTOMER_VARIANTS = [
  { name: "Office Worker", tint: 0x7a4f39, shirt: 0xc8d6e5 },
  { name: "Traveler", tint: 0x916246, shirt: 0xf6b26b },
  { name: "Student", tint: 0x5f4131, shirt: 0xa3d9a5 },
  { name: "Artist", tint: 0x8f6448, shirt: 0xe7a4b8 },
  { name: "Teacher", tint: 0x6b4b38, shirt: 0xf0d48a },
  { name: "Cyclist", tint: 0x85553d, shirt: 0x9bd0d0 }
];

// Upgrade tuning stays in one data block so costs and scaling are easy to adjust.
export const UPGRADE_DEFS = [
  {
    key: "movement",
    label: "Quick Paws",
    description: "+12 move speed",
    baseCost: 18,
    costStep: 12,
    maxLevel: 5
  },
  {
    key: "patience",
    label: "Calmer Guests",
    description: "8% slower patience loss",
    baseCost: 22,
    costStep: 14,
    maxLevel: 4
  },
  {
    key: "tips",
    label: "Tip Jar",
    description: "+20% tip bonus",
    baseCost: 20,
    costStep: 15,
    maxLevel: 4
  }
];
