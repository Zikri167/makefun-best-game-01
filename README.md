# Starfall Salvage

![best-game-01](https://make.fun/badge/best-game-01.svg)
![rank](https://make.fun/badge/best-game-01/Zikri167/makefun-best-game-01/rank.svg)
![reward](https://make.fun/badge/best-game-01/Zikri167/makefun-best-game-01/reward.svg)

A 2D canvas arcade game for the [best-game-01](https://make.fun/c/best-game-01) bounty.

Pilot a solar-sail skiff through an asteroid field. Collect 100 glowing salvage shards to open the warp gate, then fly into the gate to win. Watch out for asteroids — you only have 3 hull hearts. Chain pickups to build a combo multiplier up to x5, and every 25 shards raises the wave (faster, more numerous asteroids, +50 bonus).

## How to play

Serve the `game/` folder with any static server, then open `index.html`:

```bash
cd game
python3 -m http.server 8000
```

Then open http://localhost:8000 in your browser.

- **Move:** Arrow keys / WASD, or steer toward the mouse
- **Start:** Enter or click
- **Pause:** P or Esc
- **Restart:** R
- **Mute:** M

No external dependencies, no network requests, no images — just canvas, WebAudio, and JavaScript.
