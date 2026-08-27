# golf_training_app

[![CI](https://github.com/connorreganmoulton-web/golf_training_app/actions/workflows/ci.yml/badge.svg)](https://github.com/connorreganmoulton-web/golf_training_app/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-D9A441.svg)](LICENSE)

The training and analytics tool. Kept separate from the `myturngolf` content
folder on purpose — this repo is software, that one is video and posts.

A free golf improvement tracker you can run on your own machine.

Import your launch monitor data, log your rounds in about twenty seconds, and
get a weekly practice plan built from your own numbers instead of generic
advice.

**It is free and it will stay free.** No paid tier, no premium features, no
account required to use it on your own computer.

## Run it

```bash
docker compose up
```

Open http://localhost:3000. That's the whole setup — no database to install,
no account to create. Your data lives in a `data/` folder next to the project
and never leaves your machine.

Without Docker:

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

## What it does

**Imports launch monitor sessions.** Drop in a CSV export and it reads every
shot, works out carry spread, dispersion and reliable distance per club, and
finds the gaps in your bag. Rapsodo MLM2PRO is supported today; the importer is
built so adding TrackMan, FlightScope, SkyTrak, Garmin R10 or GSPro is one file.

**Tracks rounds without being a chore.** Five taps, no keyboard. Score, greens,
penalties, doubles, three putts. Everything normalizes per nine holes so a rare
eighteen doesn't distort your trend.

**Builds a practice plan from your data.** Once there are enough rounds to mean
something, the weekly plan shifts time toward whatever is actually costing you
strokes — and tells you why it moved.

**Tells you when it doesn't know.** Below six rounds it serves the default plan
and says so. It won't dress a population average up as personal analysis.

## What it deliberately doesn't do

There is no free, legitimate API for pulling rounds out of Arccos, Shot Scope
or 18Birdies. Arccos licenses its API commercially and keeps ownership of the
data; the others have no export. The unofficial workarounds all require handing
over your app password. This project won't ask for those, so round entry is
manual — which is why it's built to take twenty seconds.

## Hosting it for other people

```bash
# 1. In prisma/schema.prisma, change provider from "sqlite" to "postgresql"
# 2. Set POSTGRES_PASSWORD, AUTH_SECRET and AUTH_URL in .env
docker compose -f docker-compose.hosted.yml up
```

That switches on Postgres and real logins. No application code changes.

## Working on it

```bash
npm test         # vitest, against real export files in tests/fixtures/
npm run typecheck
```

Both run in CI on every pull request, alongside a Docker build that boots the
image and checks it answers a request — `docker compose up` is the headline
instruction in this README, so it gets tested like one.

The database schema is managed with Prisma migrations. After editing
`prisma/schema.prisma`, run `npm run db:migrate` and commit the generated
folder under `prisma/migrations/` — that is what lets existing users upgrade
without losing their rounds.

## Contributing an importer

1. Implement `ImportAdapter` in `src/lib/import/`
2. Register it in `src/lib/import/index.ts`
3. Add a real export file to `tests/fixtures/`

See `CLAUDE.md` for the full architecture notes.

## License

MIT. Use it, fork it, host it.

If you'd rather guarantee that hosted forks stay open source, AGPL-3.0 is the
alternative — it requires anyone running a modified version as a service to
publish their changes. MIT is the more permissive default and the easier one
for contributors; swap it if that tradeoff matters to you.
