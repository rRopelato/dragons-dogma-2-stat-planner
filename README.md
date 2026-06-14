# Dragon's Dogma 2 Stat Planner

A static web app for planning character progression in Dragon's Dogma 2. It lets you build a level-by-level vocation path, preview stat caps, compare displayed stats against permanent growth, and share builds through the URL hash.

## What it does

- Plan a build from level 1 to 999
- Choose a starter class: Archer, Fighter, Mage, or Thief
- Add vocation blocks to model your leveling path
- Switch the currently viewed vocation to compare final displayed stats
- See permanent stats, cap indicators, and secondary stats at a glance
- Inspect growth over time with the line chart
- Copy and share a build link directly from the browser

## How it works

The app is built with plain HTML, CSS, and JavaScript. There is no build step.

- [index.html](index.html) defines the page structure and loads the scripts.
- [css/style.css](css/style.css) handles the theme and responsive layout.
- [js/data.js](js/data.js) contains vocation data, stat caps, growth rules, and the level table.
- [js/engine.js](js/engine.js) simulates leveling and applies stat calculations.
- [js/gui.js](js/gui.js) wires the controls, renders the UI, and keeps the state in sync.
- [js/chart.js](js/chart.js) builds the growth chart with Chart.js.
- [js/build.js](js/build.js) encodes and decodes shareable URLs.

## Rules used by the planner

The simulator follows the data currently embedded in the project:

- Levels 2 to 200 use the level growth table in [js/data.js](js/data.js).
- Levels above 200 use flat post-200 scaling.
- Permanent caps are applied before the active vocation offsets are shown.
- The active vocation changes the displayed offsets only; it does not rewrite the leveling history.


## Sharing builds

The current build is stored in the URL hash. Copying the link preserves:

- target level
- active vocation
- starter class
- level block sequence

## Credits

- Growth data reference: [Fextralife Stat Levels](https://dragonsdogma2.wiki.fextralife.com/Stat+Levels)
- Layout inspiration: [Dark Arisen stat planner](https://github.com/stackoverflow/dragons-dogma-stat-planner)
- Support the project: [Ko-fi](https://ko-fi.com/ropelato)