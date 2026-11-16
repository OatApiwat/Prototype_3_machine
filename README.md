# Prototype 3 Machine dashboard (Docker)

Services (`docker compose up --build`):

| Service | URL | Role |
|---|---|---|
| frontend | http://localhost:8080 | React UI (nginx, proxies `/api` and `/ws`) |
| backend | http://localhost:3001 | Express + WebSocket, in-memory cache, polls InfluxDB |
| influxdb | http://localhost:8086 | time-series DB (bucket `machines`, 7 days retention (`INFLUX_RETENTION`)) |
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

## Productivity API (MDDP defect analysis)

Source: measurement `mddp_part` (one row per finished piece; tags `side`, `rc` = run card). 1 run card = 45 carrier visits = 2,700 pieces; 1 carrier = 3 strips x 20 parts = 60 suspensions; carrier numbers are reused (visit `seq` is the key inside a run card). Defect = bit mask of 6 codes: ASQ-LCM, ASQ-MCM, ASQ-PCM, ISAD-CM, LM-5, MI.

- `GET /api/mddp_184/runcards?from=<ms>&to=<ms>` run cards with pieces in the period (default: last 24 h)
- `GET /api/mddp_184/carriers?rc=<run card>` carrier visits: carrier number, strip numbers, pieces, defective, count per defect code
- `GET /api/mddp_184/parts?rc=<run card>&seq=<visit>` the 60 pieces of one carrier visit

InfluxDB keeps `INFLUX_RETENTION` (default 168 h = 7 days) of data, so the Date Start / Date End pickers can find 7 days of history. The one-shot `influx-retention` service applies the value to the existing bucket on every `docker compose up`, so changing it in `.env` needs no volume reset. Disk use grows with the retention (`mddp_fast` alone is 2,000 rows/s): watch it with `docker system df -v`.
