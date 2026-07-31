#!/usr/bin/env zsh

set -euo pipefail

CURRENT_DIR=${0:A:h}
DOTFILES_PATH="$HOME/.dotfiles"

if ! xcode-select --print-path >/dev/null 2>&1; then
  echo "Apple Command Line Tools are required."
  echo "Run 'xcode-select --install', finish the installer, then rerun this script."
  exit 1
fi

if [[ "$CURRENT_DIR" != "$DOTFILES_PATH" ]]; then
  echo "This repository must be cloned at '$DOTFILES_PATH'."
  echo "Move the checkout there, then rerun setup."
  exit 1
fi

echo 'Installing packages...'
zsh "$CURRENT_DIR/setup/packages.zsh"

echo 'Dry running dotsync...'
"$CURRENT_DIR/bin/dotsync" --defaults-action import

echo 'Next:'
echo '  - Sync dotfiles: `~/.dotfiles/bin/dotsync --defaults-action import --do`'
echo '  - Scope this checkout as personal: `~/.dotfiles/bin/git-identity personal --git-dir ~/.dotfiles`'
echo '  - Optionally review and run: `zsh ~/.dotfiles/setup/macos.zsh`'
echo '  - Login to:'
echo '    - Atuin: `atuin account login`'
echo '    - VSCode and Cursor'
echo '    - JetBrains Toolbox'
echo '  - Set up Zen Browser'
echo '  - Import misc/Raycast.rayconfig'
echo '  - Restart your computer'
