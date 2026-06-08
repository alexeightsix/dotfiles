#!/usr/bin/env bash
#
# remove-php.sh — removes PHP, Composer, ImageMagick, and the remi dnf repo.
# Run with: sudo bash /tmp/remove-php.sh
#
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "This script must run as root. Re-run with: sudo bash /tmp/remove-php.sh" >&2
  exit 1
fi

echo "This will remove the following:"
echo
echo "  RPM packages (via dnf):"
echo "    - php-cli, php-common            (the /usr/bin/php binary)"
echo "    - ImageMagick, -libs, -djvu, -heic"
echo "    - remi-release                   (the remi repo + its .repo files)"
echo
echo "  Standalone files:"
echo "    - /usr/local/bin/composer        (Composer phar)"
echo
read -r -p "Proceed? [y/N]: " ANS
if [[ ! "${ANS,,}" =~ ^(y|yes)$ ]]; then
  echo "Aborted. Nothing removed."
  exit 0
fi

# --- RPM packages ----------------------------------------------------------
# Build the list from what's actually installed, so missing pkgs don't error.
PKGS=()
for p in php-cli php-common \
         ImageMagick ImageMagick-libs ImageMagick-djvu ImageMagick-heic \
         remi-release; do
  if rpm -q "$p" >/dev/null 2>&1; then
    PKGS+=("$p")
  fi
done

if [[ ${#PKGS[@]} -gt 0 ]]; then
  echo "==> dnf remove ${PKGS[*]}"
  dnf remove -y "${PKGS[@]}"
else
  echo "==> No matching rpm packages installed; skipping dnf remove."
fi

# --- Composer phar ---------------------------------------------------------
if [[ -e /usr/local/bin/composer ]]; then
  echo "==> Removing /usr/local/bin/composer"
  rm -f /usr/local/bin/composer
else
  echo "==> /usr/local/bin/composer not present; skipping."
fi

# --- Verify ----------------------------------------------------------------
echo
echo "==> Verifying ..."

for bin in php composer convert magick; do
  if command -v "$bin" >/dev/null 2>&1; then
    echo "  !! $bin still present at: $(command -v "$bin")"
  else
    echo "  ok: $bin not found"
  fi
done

LEFTOVER=$(rpm -qa | grep -iE '^php|imagemagick|remi-release' || true)
if [[ -n "$LEFTOVER" ]]; then
  echo "  !! Remaining packages:"
  echo "$LEFTOVER" | sed 's/^/       /'
else
  echo "  ok: no php/ImageMagick/remi-release rpm packages remain"
fi

REPO=$(ls /etc/yum.repos.d/remi*.repo 2>/dev/null || true)
if [[ -n "$REPO" ]]; then
  echo "  !! remi .repo files still present:"
  echo "$REPO" | sed 's/^/       /'
else
  echo "  ok: no remi .repo files remain"
fi

echo
echo "Done."
