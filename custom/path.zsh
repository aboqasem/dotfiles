#!/usr/bin/env zsh

export PATH="$DOTFILES/bin:$PATH"

export PATH="$PATH:/usr/local/sbin"

export PATH="$(brew --prefix coreutils)/libexec/gnubin:$PATH"
export PATH="$(brew --prefix grep)/libexec/gnubin:$PATH"
export PATH="$(brew --prefix findutils)/libexec/gnubin:$PATH"
export PATH="$(brew --prefix gnu-sed)/libexec/gnubin:$PATH"

# Java
export PATH="$HOME/.jenv/bin:$PATH"

# Go
export PATH="$(go env GOPATH)/bin:$PATH"

# Bun
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
# Bun development
export PATH="/usr/local/opt/llvm@16/bin:$PATH"
