# Starfall Salvage

[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/c/best-game-01)
[![rank](https://make.fun/badge/best-game-01/Zikri167/makefun-best-game-01/rank.svg)](https://make.fun/c/best-game-01)
[![reward](https://make.fun/badge/best-game-01/Zikri167/makefun-best-game-01/reward.svg)](https://make.fun/c/best-game-01)

An entry for the [make.fun best-game-01](https://make.fun/c/best-game-01) competition: a complete 2D arcade game that runs in a desktop browser from static files, with no network request.

## The game

Pilot a solar-sail skiff through a drifting asteroid field. Collect 100 glowing salvage shards to open the warp gate and escape. Dodge tumbling asteroids — each hit costs one of three hull hearts. Every 25 shards raises the wave: faster, more numerous asteroids, and a score bonus. Chain pickups without taking a hit to build a combo multiplier up to x5.

- **Goal:** collect 100 shards, then fly into the warp gate to win.
- **Lose:** hull reaches zero hearts.
- **Controls:** Arrow keys / WASD or mouse to steer, P or Esc to pause, R to restart, M to mute.
- **Sound:** synthesized with WebAudio, no audio files.

## Play it

Serve the `game/` folder with any static HTTP server and open `index.html`, for example:

```sh
python3 -m http.server 8080 --directory game
```

## Hand in

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored make.fun library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
