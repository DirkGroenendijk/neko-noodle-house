# Neko Noodle House

Small Phaser prototype for a cozy top-down ramen shop game. The scope is intentionally narrow: one room, one cat chef, one active counter order at a time, lightweight dining tables, and a short between-day upgrade loop.

## Run

Serve the project from the repository root with any static file server:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## Controls

- `WASD` or arrow keys: move
- `E` or `Space`: interact
- `Enter`: start the day / continue from the day summary
- `1`, `2`, `3`: buy upgrades on the day summary screen

The title, layout controls, and upgrade rows are also clickable in the browser.

## Project structure

- [index.html](/Users/dirkgroenendijk/neko-noodle-house/index.html): static page shell and script entrypoint
- [styles.css](/Users/dirkgroenendijk/neko-noodle-house/styles.css): responsive page layout around the game canvas
- [src/main.js](/Users/dirkgroenendijk/neko-noodle-house/src/main.js): Phaser bootstrapping
- [src/config/gameConfig.js](/Users/dirkgroenendijk/neko-noodle-house/src/config/gameConfig.js): Phaser game configuration
- [src/data/gameData.js](/Users/dirkgroenendijk/neko-noodle-house/src/data/gameData.js): tweakable gameplay constants, recipes, stations, customers, upgrades
- [src/scenes/GameScene.js](/Users/dirkgroenendijk/neko-noodle-house/src/scenes/GameScene.js): single-scene gameplay, layout flow, dining flow, tilemap rendering, and overlays

## Gameplay loop

1. Start the shift.
2. Rearrange stations and tables on the placement grid.
3. Start the day and serve one active ordering customer at the counter.
4. Seated customers eat and leave while new orders continue arriving.
5. Spend money on simple upgrades between days.

## Tuning

Most gameplay tuning lives in [src/data/gameData.js](/Users/dirkgroenendijk/neko-noodle-house/src/data/gameData.js):

- recipe rewards
- station layout
- placement grid defaults and blocked tiles
- shared pixel palette
- day length growth
- customer variants
- upgrade costs and max levels

Scene-local layout constants for overlay spacing and bars live in [src/scenes/GameScene.js](/Users/dirkgroenendijk/neko-noodle-house/src/scenes/GameScene.js).
