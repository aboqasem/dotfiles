#!/usr/bin/env zsh

mydir=${0:a:h}

###############################################################################
# Bun                                                                         #
###############################################################################

if test ! $(which bun); then
  echo "Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
fi

###############################################################################
# Oh My Zsh                                                                   #
###############################################################################

# Install Oh My Zsh if not installed
if test ! $(which omz); then
  echo "Installing Oh My Zsh..."
  sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" &
  wait
fi

###############################################################################
# Homebrew                                                                    #
###############################################################################

# Install Homebrew if not installed
if test ! $(which brew); then
  echo "Installing Homebrew..."
  bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Make sure we’re using the latest Homebrew.
brew update

# Upgrade any already-installed formulae.
brew upgrade

brew bundle --file="$mydir/Brewfile"

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

open -a "iTerm"
open -a "AltTab"
open -a "Rectangle"
open -a "Macs Fan Control"
open -a "CleanMyMac"
open -a "Fig"
open -a "Raycast"
