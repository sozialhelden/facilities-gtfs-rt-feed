# facilities-gtfs-rt-feed

**Generate a [GTFS Realtime (GTFS-RT)](https://developers.google.com/transit/gtfs-realtime/) feed with the [status of Berlin & Brandenburg elevators](https://brokenlifts.org)** using `StationUpdate`, as proposed in [google/transit#268](https://github.com/google/transit/issues/268) & [MobilityData/transit#42](https://github.com/MobilityData/transit/pull/42).

![MIT-licensed](https://img.shields.io/github/license/derhuerst/facilities-gtfs-rt-feed.svg)
![minimum Node.js version](https://img.shields.io/node/v/facilities-gtfs-rt-feed.svg)
[![support me via GitHub Sponsors](https://img.shields.io/badge/support%20me-donate-fa7664.svg)](https://github.com/sponsors/derhuerst)
[![chat with me on Twitter](https://img.shields.io/badge/chat%20with%20me-on%20Twitter-1da1f2.svg)](https://twitter.com/derhuerst)


## Running via Docker

```shell
echo 'NODE_ENV=production' >>.env
echo 'ACCESSIBILITY_CLOUD_TOKEN=…' >>.env
docker run --env-file=.env -p 3000:3000 ghcr.io/derhuerst/facilities-gtfs-rt-feed
```

## Running manually

```shell
git clone https://github.com/derhuerst/facilities-gtfs-rt-feed.git
cd facilities-gtfs-rt-feed
npm install
npm run build
export 'ACCESSIBILITY_CLOUD_TOKEN=…'
node index.js | pino-pretty
```
