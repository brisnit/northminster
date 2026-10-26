#!/usr/bin/env bash
# Full end-to-end run on a throwaway local database + fake Google Calendar.
# Never touches production. Usage: npm run test:e2e
set -euo pipefail
cd "$(dirname "$0")/.."
export PGLITE_DIR=.data/e2e DB_DRIVER=pglite
export BETTER_AUTH_SECRET=e2e-secret-0123456789abcdef0123456789 BETTER_AUTH_URL=http://localhost:4321
npx astro dev stop >/dev/null 2>&1 || true; pkill -f fake-google 2>/dev/null || true
rm -rf "$PGLITE_DIR" .data/uploads
npm run -s db:migrate
# Test images (a valid photo, one too small, one that isn't an image).
export FIXTURES=${FIXTURES:-.data/fixtures}
mkdir -p "$FIXTURES"
node -e "
const sharp = require('sharp'); const d = process.env.FIXTURES;
sharp({ create: { width: 1800, height: 1200, channels: 3, background: { r: 40, g: 110, b: 90 } } }).jpeg().toFile(d + '/test-photo.jpg');
sharp({ create: { width: 120, height: 90, channels: 3, background: '#888' } }).png().toFile(d + '/tiny.png');
require('fs').writeFileSync(d + '/not-image.jpg', 'this is not an image');"
LINK=$(ADMIN_EMAIL=admin@test.local ADMIN_NAME="Test Admin" npm run -s db:seed | grep -E '^http')
node --import tsx tests/fake-google.ts > /tmp/npc-fake-google.log 2>&1 &
# Astro's dev server reads settings from .env.<mode>, not the shell.
cat > .env.e2e <<ENV
PGLITE_DIR=$PGLITE_DIR
DB_DRIVER=pglite
BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
BETTER_AUTH_URL=$BETTER_AUTH_URL
GOOGLE_CALENDAR_ID=test-cal@example.com
GOOGLE_SERVICE_ACCOUNT_EMAIL=svc@test.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=fake
GOOGLE_CALENDAR_API_BASE=http://localhost:4599
CRON_SECRET=test-cron-secret
ENV
npx astro dev --mode e2e --port 4321 > /tmp/npc-dev.log 2>&1 &
for i in $(seq 1 60); do curl -s -o /dev/null http://localhost:4321/ && break; sleep 1; done
curl -s -o /dev/null http://localhost:4321/admin/login; curl -s -o /dev/null http://localhost:4321/events
set +e
SET_PASSWORD_LINK="$LINK" node tests/e2e.mjs; code=$?
if [ "${KEEP:-}" != "1" ]; then npx astro dev stop >/dev/null 2>&1; pkill -f fake-google; rm -f .env.e2e; fi
exit $code
