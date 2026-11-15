# Prototype 3 Machine dashboard (Docker)

Services (`docker compose up --build`):

| Service | URL | Role |
|---|---|---|
| frontend | http://localhost:8080 | React UI (nginx, proxies `/api` and `/ws`) |
| backend | http://localhost:3001 | Express + WebSocket, in-memory cache, polls InfluxDB |
| influxdb | http://localhost:8086 | time-series DB (bucket `machines`, 24 h retention) |
| nodered | http://localhost:1880 | simulator flow: writes every value into InfluxDB |

## Data path
Node-RED (sim, ms timestamps, batch write every 250 ms) -> InfluxDB -> backend (one batched Flux query every `POLL_MS`=5 s over a window ending `POLL_MARGIN_MS`=2 s in the past so late rows are not missed, ring-buffer cache, WebSocket push) -> React (buffers rows, renders `RENDER_DELAY_MS`=9 s behind real time, interpolates between samples).
The browser never generates values; with no data it shows "No data".

## InfluxDB measurements (tag `machine=MDDP_184`)
- `mddp_fast` (tag `side` L/R, 1 kHz): `p` kPa, `vx` `vy` `vz` g
- `mddp_arm` (tag `side`, 20 Hz): `x` `y` px, `ak` (carrier no.), `disp`, `active`, `cell`, `temp` degC
- `mddp_carrier` (tag `k`, 20 Hz): `x` px, `nL`, `nR` shots done

## Node-RED layout

One tab per machine (`MDDP_184`, `CALUL_037`, `HAll_013`) plus `Influx writer`. Inside a machine tab every measurement is its own group/flow (inject every 250 ms -> function -> link out), so each value can be inspected and switched off on its own. The writer tab batches all lines for 250 ms into one InfluxDB write and logs any HTTP status other than 204.

- The machine models are in `nodered/sim/*.js` (extracted from the legacy HTML in `legacy/`); each `gen_<machine>.js` exports one generator per measurement (`signals`).
- `nodered/flows.json` is generated: edit `tools/build-flows.mjs` (or add a signal to the `signals` of a `gen_*.js` and to `INFO` in the script) and run `node tools/build-flows.mjs`.
- Measurement, tag and field names must not change: the frontend reads them.

Config: copy `.env.example` to `.env`.
