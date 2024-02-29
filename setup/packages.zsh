#!/usr/bin/env zsh

mydir=${0:a:h}

###############################################################################
# Bun                                                                         #
###############################################################################

if ! type bun >/dev/null; then
  echo "Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
fi

###############################################################################
# Oh My Zsh                                                                   #
###############################################################################

# Install Oh My Zsh if not installed
if ! [ -d "$HOME/.oh-my-zsh" ]; then
  echo "Installing Oh My Zsh..."
  sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" &
  wait
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
# Java                                                                        #
###############################################################################

echo "Initializing jenv..."
export PATH="$HOME/.jenv/bin:$PATH"
eval "$(jenv init -)"
jenv enable-plugin maven
for dir in /usr/local/Cellar/openjdk*; do
  for dir in $dir/*/libexec/openjdk.jdk/Contents/Home; do
    jenv add $dir
  done
done
jenv refresh-versions

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

fig launch
