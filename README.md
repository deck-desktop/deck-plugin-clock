# Clock

The time in the footer, in whichever timezone you pick.

The smallest useful plugin here, and deliberately so: a footer readout and a settings panel, with
no tab at all. It exists as much to show that a plugin does not have to be a whole module as to
tell the time.

## What it exports

| Export | Where it renders |
|---|---|
| `Status` | the footer readout |
| `Settings` | the timezone picker |
| `commands` | palette entry to switch zone |

Timezones are validated against the browser's own `Intl` database rather than a bundled list, so
anything your system knows about works.

## Build

```sh
node plugins/clock/build.mjs
```

See [../README.md](../README.md) for how the build and the shims work.

## Install

Copy `plugin.json` and `plugin.js` into `%APPDATA%\Deck\plugins\clock\` (`Deck-Dev` for a
debug build) and restart Deck.
