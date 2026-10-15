# routing-hose.github.io

Project page for **R-HDLO: Routing Hoses and Tubing Using Learned Predictive Dynamics for Hollow Deformable
Linear Objects**. Static site, no framework (Inter, one stylesheet with light/dark tokens); two interactive three.js
viewers, an SVG explorer of the real-robot run, and hand-drawn SVG charts. Every video is text-free;
the labels, numbers and caveats live in `index.html`.

```
index.html                       the page
assets/css/site.css              styles
assets/js/site.js                nav, lazy videos, pipeline stepper, tabs, chapters, SVG charts, galleries
assets/js/real-explorer.mjs      real-robot run explorer         <- assets/data/real_g2.json, assets/img/real/
assets/js/common.mjs             shared three.js viewer (table, pegs, goal rings, tubes)
assets/js/mppi-explorer.mjs      interactive MPPI explorer      <- assets/data/mppi_*.json
assets/js/dynamics-explorer.mjs  interactive dynamics explorer  <- assets/data/dynamics.json
assets/data/*.segments.json      chapter times of the rendered MPPI episodes
assets/videos/, assets/img/      web encodes and posters
```

The real-robot section is one run of the bimanual YAM rig (`run_20260917_150620`: G2 board, 70 mm hose,
three pegs routed in four MPPI moves). `assets/videos/real/` are web encodes of its Blender + camera
renders; `real_g2.json` is baked from the run's own record (tracked hose, candidate and executed forecasts,
gripper paths, probe z-fit errors).

The scripts that rebuild the assets live with the project code and will be released with it.

## Local preview

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```
