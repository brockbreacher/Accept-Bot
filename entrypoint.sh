#!/bin/sh
set -e

mkdir -p /usr/src/app/acceptbot/roledata
chown -R node:node /usr/src/app/acceptbot
chmod -R 755 /usr/src/app/acceptbot

exec su-exec node "$@"
