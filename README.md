# routing-hose.github.io

Project page for **R-HDLO: Routing Hoses and Tubing Using Learned Predictive Dynamics for Hollow Deformable
Linear Objects**. Static site (Bulma + Google Sans); two interactive three.js viewers; every video is
text-free, and the labels, numbers and caveats live in `index.html`.

```
index.html                       the page
assets/css/site.css              styles
assets/js/site.js                tabs, chapters, lazy videos, galleries, results bars, real-world cases
assets/js/common.mjs             shared three.js viewer (table, pegs, goal rings, tubes)
assets/js/mppi-explorer.mjs      interactive MPPI explorer      <- assets/data/mppi_*.json
assets/js/dynamics-explorer.mjs  interactive dynamics explorer  <- assets/data/dynamics.json
assets/data/*.segments.json      chapter times of the rendered MPPI episodes
assets/videos/, assets/img/      web encodes and posters (assets/img/paper/: figures from the paper)
```

Numbers and figures follow the ICRA 2027 submission (main.tex Tables I-II, real-world prediction table).
The two real-world cases are rendered runs of the YAM rig: Goal 5 / Hose 6 is
`run_20260917_150620` (70 mm hose, routed in four moves); Goal 1 / Hose 5 is `run_20261015_exec10b`
(11 mm hose on the fixture board, an attempt stopped by the operator after five moves).

The scripts that rebuild the assets live with the project code and will be released with it.

## Local preview

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```
