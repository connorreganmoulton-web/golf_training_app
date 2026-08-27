#!/bin/sh
# Bring the database up to the current schema before serving. On a first run
# this creates the tables; on an upgrade it applies only the new migrations,
# so an existing round history survives a `docker compose pull`.
set -e
node node_modules/prisma/build/index.js migrate deploy
exec "$@"
