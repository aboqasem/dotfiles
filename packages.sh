#!/usr/bin/env zsh

###############################################################################
# Homebrew                                                                    #
###############################################################################

# Install Homebrew if not installed
if ! which brew &>/dev/null; then
  echo "Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Make sure we’re using the latest Homebrew.
brew update

# Upgrade any already-installed formulae.
brew upgrade

# Save Homebrew’s installed location.
BREW_PREFIX=$(brew --prefix)

# Taps
brew tap "homebrew/bundle"
brew tap "homebrew/cask"
brew tap "homebrew/cask-versions"
brew tap "homebrew/core"
brew tap "homebrew/services"

# Install GNU core utilities (those that come with macOS are outdated).
# Don’t forget to add `$(brew --prefix coreutils)/libexec/gnubin` to `$PATH`.
brew install coreutils
ln -s "${BREW_PREFIX}/bin/gsha256sum" "${BREW_PREFIX}/bin/sha256sum"

# Install some other useful utilities like `sponge`.
brew install moreutils
# Install GNU `find`, `locate`, `updatedb`, and `xargs`, `g`-prefixed.
brew install findutils
# Install GNU `sed`, overwriting the built-in `sed`.
brew install gnu-sed
# Install a modern version of Zsh & Bash.
brew install zsh bash

# Switch to using brew-installed shells
if ! grep -Fq "${BREW_PREFIX}/bin/zsh" /etc/shells; then
  echo "${BREW_PREFIX}/bin/zsh" | sudo tee -a /etc/shells
  echo "${BREW_PREFIX}/bin/bash" | sudo tee -a /etc/shells

  # Set default shell to Zsh
  chsh -s "${BREW_PREFIX}/bin/zsh"
fi

# Install GnuPG to enable PGP-signing commits.
brew install gnupg

# Install more recent versions of some macOS tools.
brew install vim
brew install grep
brew install openssh
brew install screen
brew install gmp

# Java
brew install --cask oracle-jdk
brew install openjdk
brew install openjdk@11
brew install maven

brew install jenv
export PATH="$HOME/.jenv/bin:$PATH"
eval "$(jenv init -)"
jenv enable-plugin maven
for dir in /usr/local/Cellar/openjdk*; do
  for dir in $dir/*/libexec/openjdk.jdk/Contents/Home; do
    jenv add $dir
  done
done

# Git
brew install git
brew install git-lfs && git lfs install && git lfs install --system
brew install git-delta
brew install git-gui
brew install gh

# Install other useful binaries.
brew install gs
brew install imagemagick
brew install rename
brew install tree
brew install fzf
brew install fd
brew install less
brew install nano
brew install tldr
brew install shellcheck
brew install speedtest-cli
brew install watch
brew install heroku/brew/heroku
brew install postgresql

# Install casks
brew install --cask iterm2
brew install --cask alt-tab && open -a "AltTab"
brew install --cask rectangle && open -a "Rectangle"
brew install --cask raycast && open -a "Raycast"
brew install --cask fig && open -a "Fig"
brew install --cask cleanmymac && open -a "CleanMyMac X"
brew install --cask macs-fan-control && open -a "Macs Fan Control"
brew install --cask brave-browser
brew install --cask postman
brew install --cask visual-studio-code
brew install --cask jetbrains-toolbox
brew install --cask pgadmin4
brew install --cask docker
brew install --cask libreoffice
brew install --cask adobe-acrobat-reader
brew install --cask gimp
brew install --cask qlcolorcode
brew install --cask qlimagesize
brew install --cask qlmarkdown
brew install --cask qlstephen
brew install --cask qlvideo
brew install --cask quicklook-json

# Remove outdated versions from the cellar.
brew cleanup

###############################################################################
# Node, NPM, and PNPM                                                         #
###############################################################################

brew install nvm

# Install Node if not installed
if ! which node &>/dev/null; then
  echo "Installing Node..."
  nvm install --lts --latest-npm --default
fi

npm i -g pnpm git-split-diffs rebase-editor commitizen vercel

###############################################################################
# Oh My Zsh                                                                   #
###############################################################################

# Install Oh My Zsh if not installed
if [ ! -d "$HOME/.oh-my-zsh" ]; then
  echo "Installing Oh My Zsh..."
  sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" &
  wait
fi

ZSH_CUSTOM="${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}"

# Install or update plugins
for pluginDetail in {zsh-users/{zsh-autosuggestions,zsh-syntax-highlighting},MichaelAquilina/zsh-you-should-use:you-should-use}; do
  pluginName="$(echo "$pluginDetail" | cut -d':' -f2 | xargs -n1 basename)"
  pluginRepo="$(echo "$pluginDetail" | cut -d':' -f1)"
  if [ ! -d "$ZSH_CUSTOM"/plugins/"$pluginName" ]; then
    git clone https://github.com/"$pluginRepo"/ "$ZSH_CUSTOM"/plugins/"$pluginName"/
  else
    (cd "$ZSH_CUSTOM"/plugins/"$pluginName" && git pull)
  fi
done

# Theme
if [ ! -f "$ZSH_CUSTOM"/themes/aboqasem.zsh-theme ]; then
  mkdir -p "$ZSH_CUSTOM"/themes
  cp "$HOME"/init/aboqasem.zsh-theme "$ZSH_CUSTOM"/themes/
fi
