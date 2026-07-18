#!/usr/bin/env bash
#
# SYJ Nexus Engine — universal installer / initializer
#
# Verifies prerequisites, installs dependencies, creates .env if missing,
# initializes the SQLite database, runs migrations, seeds baseline data,
# and verifies the installation. Safe to run more than once.
#
# Usage:
#   chmod +x init.sh
#   ./init.sh
#

set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

info()  { echo -e "${BOLD}[init]${RESET} $1"; }
ok()    { echo -e "${GREEN}[ok]${RESET} $1"; }
warn()  { echo -e "${YELLOW}[warn]${RESET} $1"; }
fail()  { echo -e "${RED}[error]${RESET} $1"; exit 1; }

echo ""
echo "=================================================="
echo "   SYJ Nexus Engine — Initialization"
echo "   SAYANJALI NEXUS PRIVATE LIMITED"
echo "=================================================="
echo ""

# --- 1. Verify Node.js -----------------------------------------------------
info "Checking Node.js..."
if ! command -v node >/dev/null 2>&1; then
  fail "Node.js is not installed. Install Node.js >= 18.18.0 and re-run this script."
fi

NODE_VERSION=$(node -v | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  fail "Node.js >= 18.18.0 is required. Found: v$NODE_VERSION"
fi
ok "Node.js v$NODE_VERSION detected"

# --- 2. Verify npm ----------------------------------------------------------
info "Checking npm..."
if ! command -v npm >/dev/null 2>&1; then
  fail "npm is not installed. It ships with Node.js — reinstall Node.js and re-run."
fi
ok "npm $(npm -v) detected"

# --- 3. Install dependencies -------------------------------------------------
info "Installing dependencies (this may take a minute)..."
if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund
else
  npm install --no-audit --no-fund
fi
ok "Dependencies installed"

# --- 4. Create .env if missing ----------------------------------------------
info "Checking environment configuration..."
if [ ! -f .env ]; then
  cp .env.example .env

  # Generate real random secrets rather than leaving placeholders.
  if command -v node >/dev/null 2>&1; then
    SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    CSRF_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    # Portable in-place sed (works on both GNU and BSD/macOS sed)
    sed -i.bak "s/^SESSION_SECRET=.*/SESSION_SECRET=${SESSION_SECRET}/" .env && rm -f .env.bak
    sed -i.bak "s/^CSRF_SECRET=.*/CSRF_SECRET=${CSRF_SECRET}/" .env && rm -f .env.bak
  fi

  ok ".env created with freshly generated secrets"
  warn "Review .env and update SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD before production use"
else
  ok ".env already exists — leaving it untouched"
fi

# --- 5. Initialize SQLite database directory --------------------------------
info "Preparing data directory..."
mkdir -p data
ok "Data directory ready at ./data"

# --- 6. Generate + run migrations -------------------------------------------
info "Generating database schema (drizzle-kit)..."
npx drizzle-kit generate
ok "Schema generated"

info "Applying migrations..."
npx tsx scripts/migrate.ts
ok "Migrations applied"

# --- 7. Seed initial data ----------------------------------------------------
info "Seeding baseline data (organization, admin user, sample records)..."
npx tsx scripts/seed.ts
ok "Baseline data seeded"

# --- 8. Verify installation ---------------------------------------------------
info "Verifying installation..."
if npx tsx scripts/health-check.ts; then
  ok "Health check passed"
else
  fail "Health check failed — see output above"
fi

# --- 9. Success ---------------------------------------------------------------
echo ""
echo "=================================================="
echo -e "${GREEN}${BOLD}   SYJ Nexus Engine is ready.${RESET}"
echo "=================================================="
echo ""
echo "  Next steps:"
echo "    npm run dev        # start the development server"
echo "    npm run build      # build for production"
echo "    npm run start      # run the production server"
echo ""
echo "  The app will be available at: http://localhost:3000"
echo "  API base path:                http://localhost:3000/api"
echo ""
echo "  Default admin credentials are in your .env"
echo "  (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD) — change the password"
echo "  after first login."
echo ""
