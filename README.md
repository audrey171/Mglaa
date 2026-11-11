# Mglaa

An instrument that turns colors and weaving patterns into music.

[Play Mglaa](https://mglaa.com)
[Instructions](https://mglaa.com/about-instructions.html) 
[How it works](https://mglaa.com/about-how-it-works.html)

Choose two colors and a pixel weaving patterns, or draw your own. The colors set the harmony, the pattern shapes the melody. Your changes build a scrolling textile that you can save as a pdf.

## Development

Plain HTML, CSS, and JavaScript. No installation or build step.

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Open [localhost:8080](http://localhost:8080). Run the tests with Node.js:

```sh
npm test
```

## Code

| Files | Purpose |
| --- | --- |
| `color-app.js`, `style.css` | Interface and playback controls |
| `color-model.js`, `color-audio.js`, `voices.js` | Color-to-music mapping and sound |
| `weave-library.js`, `weave-presets.js` | Pattern library and textile generation |
| `timeline.js`, `pattern-pdf.js`, `export-preview.*` | History and PDF export |
| `tests/` | Automated checks |
| `samples/`, `vendor/` | Audio, bundled libraries, and their licenses |

## Credits

Patterns: Josephine E. Estes, *Miniature Patterns for Hand Weaving*, [Part One](https://www2.cs.arizona.edu/patterns/weaving/monographs/eje_min1.pdf) and [Part Two](https://www2.cs.arizona.edu/patterns/weaving/monographs/eje_min2.pdf).

Audio: [FreePats sample sources and licenses](samples/provenance.json). PDF export: [pdf-lib](vendor/pdf-lib-LICENSE.md), MIT licensed.
