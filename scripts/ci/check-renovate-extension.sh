#!/usr/bin/env bash
set -euo pipefail

cd "${EXTENSION_DIR:?EXTENSION_DIR must identify a maintained extension}"
npm ci
npm run build
npm run test --if-present
