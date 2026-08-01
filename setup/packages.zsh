#!/usr/bin/env zsh

set -euo pipefail

CURRENT_DIR=${0:a:h}

###############################################################################
# Mise                                                                        #
###############################################################################

if command -v mise >/dev/null 2>&1; then
  MISE_BIN=$(command -v mise)
elif [[ -x "$HOME/.local/bin/mise" ]]; then
  MISE_BIN="$HOME/.local/bin/mise"
else
  echo "Installing Mise..."
  curl -fsSL https://mise.run | sh
  MISE_BIN="$HOME/.local/bin/mise"
fi

if [[ ! -x "$MISE_BIN" ]]; then
  echo "Mise was not found at '$MISE_BIN'."
  exit 1
fi

if [[ ! -e "$HOME/.asdf" && ! -L "$HOME/.asdf" ]]; then
  ln -s "$HOME/.local/share/mise" "$HOME/.asdf"
fi

if ! "$MISE_BIN" which bun >/dev/null 2>&1; then
  "$MISE_BIN" use --global bun@latest
fi
if ! "$MISE_BIN" which maven >/dev/null 2>&1; then
  "$MISE_BIN" use --global maven@latest
fi
if ! "$MISE_BIN" which java >/dev/null 2>&1; then
  "$MISE_BIN" use --global java@latest
fi
if ! "$MISE_BIN" which go >/dev/null 2>&1; then
  "$MISE_BIN" use --global go@latest
fi

###############################################################################
# Homebrew                                                                    #
###############################################################################

# Install or update Homebrew
if command -v brew >/dev/null 2>&1; then
  BREW_BIN=$(command -v brew)
elif [[ -x /opt/homebrew/bin/brew ]]; then
  BREW_BIN=/opt/homebrew/bin/brew
elif [[ -x /usr/local/bin/brew ]]; then
  BREW_BIN=/usr/local/bin/brew
else
  echo "Installing Homebrew..."
  bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  if [[ -x /opt/homebrew/bin/brew ]]; then
    BREW_BIN=/opt/homebrew/bin/brew
  elif [[ -x /usr/local/bin/brew ]]; then
    BREW_BIN=/usr/local/bin/brew
  else
    echo "Homebrew installation finished, but the brew executable was not found."
    exit 1
  fi
fi

eval "$("$BREW_BIN" shellenv)"

echo "Updating Homebrew..."
brew update

echo "Installing Homebrew packages..."
brew bundle --file="$CURRENT_DIR/Brewfile"

outdated=$(brew outdated)
if [ -n "$outdated" ]; then
  echo "Outdated Homebrew packages:"
  echo "$outdated"
fi

# Save Homebrew’s installed location.
BREW_PREFIX=$(brew --prefix)

###############################################################################
# Utils                                                                       #
###############################################################################

if [[ ! -e "${BREW_PREFIX}/bin/sha256sum" && ! -L "${BREW_PREFIX}/bin/sha256sum" ]]; then
  ln -s "${BREW_PREFIX}/bin/gsha256sum" "${BREW_PREFIX}/bin/sha256sum"
fi

# Switch to using brew-installed shells
if ! grep -Fq "${BREW_PREFIX}/bin/zsh" /etc/shells; then
  echo "${BREW_PREFIX}/bin/zsh" | sudo tee -a /etc/shells
  echo "${BREW_PREFIX}/bin/bash" | sudo tee -a /etc/shells

  # Set default shell to Zsh
  chsh -s "${BREW_PREFIX}/bin/zsh"
fi
