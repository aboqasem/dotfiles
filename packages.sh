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
# brew install openssh
# brew install screen
# brew install php
# brew install gmp

# Install font tools.
# brew tap bramstein/webfonttools
# brew install sfnt2woff
# brew install sfnt2woff-zopfli
# brew install woff2

# Install some CTF tools; see https://github.com/ctfs/write-ups.
# brew install aircrack-ng
# brew install bfg
# brew install binutils
# brew install binwalk
# brew install cifer
# brew install dex2jar
# brew install dns2tcp
# brew install fcrackzip
# brew install foremost
# brew install hashpump
# brew install hydra
# brew install john
# brew install knock
# brew install netpbm
# brew install nmap
# brew install pngcheck
# brew install socat
# brew install sqlmap
# brew install tcpflow
# brew install tcpreplay
# brew install tcptrace
# brew install ucspi-tcp # `tcpserver` etc.
# brew install xpdf
# brew install xz

# Install other useful binaries.
brew install git
brew install git-lfs
brew install gs
brew install imagemagick
brew install rename
brew install tree
brew install docker
brew install fzf
brew install fd
brew install gh
brew install git-delta
brew install git-gui
brew install less
brew install openjdk
brew install nano
brew install nvm
brew install node
brew install tldr
brew install shellcheck
brew install speedtest-cli
brew install watch
brew install heroku/brew/heroku
brew install postgresql
# brew install ack
# brew install exiv2
# brew install lua
# brew install lynx
# brew install p7zip
# brew install pigz
# brew install pv
# brew install rlwrap
# brew install ssh-copy-id
# brew install vbindiff
# brew install zopfli

# Install casks
brew install --cask iterm2
brew install --cask alt-tab
brew install --cask rectangle
brew install --cask raycast
brew install --cask fig
brew install --cask brave-browser
brew install --cask insomnia
brew install --cask visual-studio-code
brew install --cask pgadmin4
brew install --cask docker
brew install --cask oracle-jdk
brew install --cask cleanmymac
brew install --cask macs-fan-control
brew install --cask qlcolorcode
brew install --cask qlimagesize
brew install --cask qlmarkdown
brew install --cask qlstephen
brew install --cask qlvideo
brew install --cask quicklook-json
brew install --cask gimp

# Remove outdated versions from the cellar.
brew cleanup

###############################################################################
# Node, NPM, and PNPM                                                         #
###############################################################################

# Install Node if not installed
if ! which node &>/dev/null; then
  echo "Installing Node..."
  nvm install --lts --latest-npm --default
fi

npm i -g pnpm
npm i -g git-split-diff
npm i -g rebase-editor
npm i -g commitizen
npm i -g vercel

###############################################################################
# Oh My Zsh                                                                   #
###############################################################################

# Install Oh My Zsh if not installed
if [ ! -d "$HOME/.oh-my-zsh" ]; then
  echo "Installing Oh My Zsh..."
  sh -c "$(curl -fsSL https://raw.githubusercontent.com/robbyrussell/oh-my-zsh/master/tools/install.sh)"
fi

ZSH_CUSTOM="${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}"

# Autosuggestions plugin
if [ ! -d "$ZSH_CUSTOM"/plugins/zsh-autosuggestions ]; then
  git clone https://github.com/zsh-users/zsh-autosuggestions "$ZSH_CUSTOM"/plugins/zsh-autosuggestions
fi

# Syntax highlighting plugin
if [ ! -d "$ZSH_CUSTOM"/plugins/zsh-syntax-highlighting ]; then
  git clone https://github.com/zsh-users/zsh-syntax-highlighting.git "$ZSH_CUSTOM"/plugins/zsh-syntax-highlighting
fi

# You Should Use plugin
if [ ! -d "$ZSH_CUSTOM"/plugins/you-should-use ]; then
  git clone https://github.com/MichaelAquilina/zsh-you-should-use.git "$ZSH_CUSTOM"/plugins/you-should-use
fi

# Theme
if [ ! -f "$ZSH_CUSTOM"/themes/aboqasem.zsh-theme ]; then
  mkdir -p "$ZSH_CUSTOM"/themes
  cp "$HOME"/init/aboqasem.zsh-theme "$ZSH_CUSTOM"/themes/
fi
