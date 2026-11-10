# mglaa

A two-color musical instrument built from weaving drafts.

Website: [mglaa.com](https://mglaa.com)

Choose from 48 patterns in Josephine E. Estes’s *Miniature Patterns for Hand Weaving*, Parts One and Two, or draw a custom threading. Two colors determine the visual palette and shared musical harmony. Each pattern has its own default palette and melody/pad instrument pairing. Palette and pattern changes update the tune immediately.

## Run locally

No installation or build step is required. Serve this folder over HTTP:

```sh
python3 -m http.server 8080
```

Then open http://localhost:8080. A browser with Web Audio support is required; playback begins after a click or Space.

For the automated checks, install Node.js and run `npm test`.

## Controls

- Pattern name: select a book draft or Custom.
- Two squares: edit the pattern and background colors.
- Square beside the palette or Space: play/pause.
- Upper-right 8 × 4 grid: melody instruments on the left, pad instruments on the right.
- Custom draft: click/drag to change a column’s shaft; arrow keys also edit.
- About: instructions, softness (100% by default), and volume.

All top drafts share a display width and end on a whole square. Short sequences repeat; longer ones are visually cropped. The full source draft still generates the textile and melody.

## Structure and sound

`weave-library.js` contains 48 transcribed drafts, their source page/variation, palettes, and instrument defaults. `weave-presets.js` computes each crossing from the warp shaft and lowered harness pair. Optional borders and full-height tabby rows are excluded to preserve the square-cell pattern-pick proportions of the printed illustrations.

`color-model.js` derives a shared seventh chord from palette hues and saturation, then uses hex digits, lightness, threading, and harness combinations to form a melody. Notes stay in the pad chord at a constant 84 BPM. The textile is a weaving drawdown, not a note-per-square piano roll.

`color-audio.js` and `voices.js` provide softened sample playback and sustained synthesized pads. Sample source attribution and licenses are included in `samples/`.

## Pattern sources

Josephine E. Estes, *Miniature Patterns for Hand Weaving*:

- [Part One](https://www2.cs.arizona.edu/patterns/weaving/monographs/eje_min1.pdf)
- [Part Two](https://www2.cs.arizona.edu/patterns/weaving/monographs/eje_min2.pdf)

One treadling variation is included per named pattern. The selected variation is recorded with each entry; Snowball Allover uses the “rose in corners” sequence.
