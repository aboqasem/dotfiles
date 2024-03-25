#!/usr/bin/env zsh

mydir=${0:a:h}

###############################################################################
# Mise                                                                        #
###############################################################################

if ! type mise >/dev/null; then
  echo "Installing Mise..."
  curl https://mise.run | sh
  mise="~/.local/bin/mise"
fi
if [ ! -d ~/.asdf ]; then
  ln -s ~/.local/share/mise ~/.asdf
fi

if ! mise which bun >/dev/null; then
  mise u -g bun@latest
fi
if ! mise which java >/dev/null; then
  mise u -g java@latest
fi
if ! mise which go >/dev/null; then
  mise u -g go@latest
fi

###############################################################################
# Homebrew                                                                    #
###############################################################################

# Install or update Homebrew
if ! type brew >/dev/null; then
  echo "Installing Homebrew..."
  bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
  echo "Updating Homebrew..."
  brew update
fi

echo "Installing Homebrew packages..."
brew bundle --file="$mydir/Brewfile"

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

ln -s "${BREW_PREFIX}/bin/gsha256sum" "${BREW_PREFIX}/bin/sha256sum"

# Switch to using brew-installed shells
if ! grep -Fq "${BREW_PREFIX}/bin/zsh" /etc/shells; then
  echo "${BREW_PREFIX}/bin/zsh" | sudo tee -a /etc/shells
  echo "${BREW_PREFIX}/bin/bash" | sudo tee -a /etc/shells

  # Set default shell to Zsh
  chsh -s "${BREW_PREFIX}/bin/zsh"
fi

###############################################################################
# Other                                                                       #
###############################################################################

for item in {com.googlecode.iterm2:iTerm,com.lwouis.alt-tab-macos:AltTab,com.knollsoft.Rectangle:Rectangle,com.crystalidea.macsfancontrol:MacsFanControl,com.macpaw.CleanMyMac4:CleanMyMac,com.raycast.macos:Raycast}; do
  app=${item#*:}
  domain=${item%%:*}
  if ! defaults read $domain >/dev/null; then
    open -a "$app" >/dev/null &
  fi
done
unset app domain item

cw launch
