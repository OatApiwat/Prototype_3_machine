# Prototype 3 Machine dashboard (Docker)

Services (`docker compose up --build`):

| Service | URL | Role |
|---|---|---|
| frontend | http://localhost:8080 | React UI (nginx, proxies `/api` and `/ws`) |
| backend | http://localhost:3001 | Express + WebSocket, in-memory cache, polls InfluxDB |
| influxdb | http://localhost:8086 | time-series DB (bucket `machines`, 24 h retention) |
| nodered | http://localhost:1880 | simulator flow: writes every value into InfluxDB |

## Data path
Node-RED (sim, ms timestamps, batch write every 250 ms) -> InfluxDB -> backend (one batched Flux query every `POLL_MS`=5 s, ring-buffer cache, WebSocket push) -> React (buffers rows, renders `RENDER_DELAY_MS`=8 s behind real time, interpolates between samples).
The browser never generates values; with no data it shows "No data".

## InfluxDB measurements (tag `machine=MDDP_184`)
- `mddp_fast` (tag `side` L/R, 1 kHz): `p` kPa, `vx` `vy` `vz` g
- `mddp_arm` (tag `side`, 20 Hz): `x` `y` px, `ak` (carrier no.), `disp`, `active`, `cell`, `temp` degC
- `mddp_carrier` (tag `k`, 20 Hz): `x` px, `nL`, `nR` shots done

The simulator model is `nodered/sim/mddp.js` (extracted from the legacy HTML in `legacy/`). CALUL_037 and HAll_013 are next.

Config: copy `.env.example` to `.env`.
