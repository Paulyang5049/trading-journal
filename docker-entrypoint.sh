#!/bin/sh
set -e
# Apply migrations to the persisted SQLite DB, then start the server.
npx prisma migrate deploy
exec npm start
