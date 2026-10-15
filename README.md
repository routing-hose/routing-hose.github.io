# routing-hose.github.io

Project page for **R-HDLO: Routing Hoses and Tubing Using Learned Predictive Dynamics for Hollow Deformable
Linear Objects**. Static site (Bulma + Google Sans); two interactive three.js viewers; every video is
text-free, and the labels, numbers and caveats live in `index.html`.

```
index.html                       the page
assets/css/site.css              styles
assets/js/site.js                tabs, chapters, lazy videos, galleries, real-hose before/after slider
assets/js/common.mjs             shared three.js viewer (table, pegs, goal rings, tubes)
assets/js/mppi-explorer.mjs      interactive MPPI explorer      <- assets/data/mppi_*.json
assets/js/dynamics-explorer.mjs  interactive dynamics explorer  <- assets/data/dynamics.json
assets/data/*.segments.json      chapter times of the rendered MPPI episodes
assets/videos/, assets/img/      web encodes and posters
```

The scripts that rebuild the assets live with the project code and will be released with it.

## Local preview

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```
