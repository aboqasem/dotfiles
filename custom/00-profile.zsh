#!/usr/bin/env zsh

eval "$(/opt/homebrew/bin/brew shellenv)"

# Homebrew completions
fpath+=~/.zfunc
if type brew &>/dev/null; then
  FPATH=$(brew --prefix)/share/zsh/site-functions:$FPATH

  autoload -Uz compinit
  compinit
fi

# atuin init
eval "$(atuin init zsh --disable-up-arrow)"

# bun completions
bun completions &>/dev/null
[ -s "$HOME/.bun/_bun" ] && source "$HOME/.bun/_bun"
