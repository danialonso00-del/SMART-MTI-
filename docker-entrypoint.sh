#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  if [ "$PRISMA_SCHEMA_SYNC" = "migrate" ]; then
    echo "Applying Prisma migrations..."
    npx prisma migrate deploy
  elif [ "$PRISMA_SCHEMA_SYNC" = "push" ]; then
    echo "Applying Prisma schema with db push..."
    npx prisma db push --skip-generate
  else
    echo "Skipping Prisma schema sync."
  fi
fi

exec "$@"
