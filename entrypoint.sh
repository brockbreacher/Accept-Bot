#!/bin/sh
set -e

mkdir -p /usr/src/app/roledata
chown -R node:node /usr/src/app/roledata
chmod -R 755 /usr/src/app/roledata

exec su-exec node "$@"
