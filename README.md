# CableLossFinder

A free, mobile-friendly [Crewfinder](https://crewfinder.co.za) tool to predict speaker cable attenuation from 20 Hz to 20 kHz (adjustable). No login, payment, database, server API or build step.

## Features

- Editable physical constants, frequency settings, cable length and amplifier output impedance.
- NL2 (one pair), NL4 (two pairs) and NL8 (four pairs), with independent conductor size, driver impedance, parallel driver count and labels on each pair. Pin labels are illustrative; follow the actual manufacturer's pinout.
- Live updating graph (a **simulation**, not audio capture or measurement).
- Save up to six frozen trace memories to compare different cables and loads; remove individual captures or clear all.
- Pink-noise average **power transfer**, evaluated with equal weight per logarithmic frequency interval, shown in dB for the first active circuit.
- All calculations run in the browser; captures are held in page memory and lost on refresh.

## Run locally

Open `index.html` using any static HTTP server. ES modules may not load from `file://` URLs.

For example, Python can serve static files locally (it is **not** an application backend):

```sh
python3 -m http.server 8080
```

Then browse `http://localhost:8080`.

Test the calculation core if Node.js is installed:

```sh
node --test tests/physics.test.mjs
```

## NUC / production hosting

Publish the repository contents in a directory served by your **existing** Caddy instance on the NUC. Confirm that `clf.crewfinder.co.za` DNS resolves to the public entry point, and that your existing firewall/reverse-proxy path reaches the NUC before enabling the route. Do not replace other site routes. Example Caddy site block (adapt paths and TLS/routing to your environment):

```caddyfile
clf.crewfinder.co.za {
    root * /srv/cablelossfinder
    file_server
    encode zstd gzip
}
```

Deploy only after reviewing and testing the feature branch. Linking the tool from the Crewfinder homepage is a **separate change to the Crewfinder repository**; none is performed here.

## Calculation notes

Based on the cable-series-impedance / loudspeaker voltage-divider technique described in [L-Acoustics, *Cable Effects* (2015)](https://www.l-acoustics.com/wp-content/uploads/2021/10/RS2015-Cable_Effects.pdf).

For a single independent pin pair:

- Nominal conductor radius `r = sqrt(S / π)`, where `S` is the single-conductor area in m².
- Skin depth `δ = sqrt(ρ / (π μ₀ μᵣ f))`. When `δ >= r`, full nominal area is used. Otherwise an **approximate** conducting annulus area `π[r² - (r - δ)²]` is used. This is **not** an exact AC resistance calculation for stranded or closely spaced conductors.
- Loop resistance `R_cable(f) = 2ρl/S_eff(f)` (out and return).
- Cable reactance `X_cable(f) = 2πfL_pair l`, where the **pair-loop** inductance `L_pair` is specified directly in µH/m. For the same convention as the paper's `L0`, set `L_pair = 2 L0` if `L0` denotes the inductance of one conductor; check cable datasheets before comparing.
- With assumed constant impedance magnitude `Z = nominalΩ / parallelDrivers`, and constant phase `θ`, `H = |Z| / |Z cosθ + R_cable + Z_amp + j(Z sinθ + X_cable)|`.
- `Loss_dB(f) = 20 log10(H)`.
- Pink-noise summary: `10 log10(mean(H(f)^2))` using log-spaced samples, corresponding to equal input noise power in equal logarithmic frequency intervals for this simplified load model.

**Limitations:** The app predicts *relative electrical voltage attenuation* assuming an ideal amplifier source plus user-defined real output impedance. The pink-noise number is a simplified band-averaged electrical transfer, **not measured SPL**, nor necessarily true dissipated-power efficiency for a reactive load. Real speakers have frequency-varying magnitude and phase. Mutual coupling, proximity effects, cable capacitance, connector resistance, heating, signal processing and crossover networks are not modeled. Never use this tool alone for safe current-carrying decisions or amplifier compatibility.

## Scope

Static HTML, CSS and JavaScript; intentionally no framework, backend, analytics, accounts or monetization.
