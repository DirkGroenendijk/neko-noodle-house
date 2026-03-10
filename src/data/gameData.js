export const DAY_LENGTH_SECONDS = 90;
export const PLAYER_SPEED = 160;
export const CUSTOMER_SPEED = 70;
export const MAX_PATIENCE = 100;
export const BASE_BOWL_REWARD = 12;
export const MAX_TIP = 6;
export const DAY_TIME_INCREMENT = 5;

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
