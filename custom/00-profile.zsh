#!/usr/bin/env zsh

eval "$(/opt/Homebrew/bin/brew shellenv)"

# zellij completions: https://zellij.dev/documentation/controlling-zellij-through-cli#completions
source <(zellij setup --generate-completion zsh | sed '/_zellij "$@"/d')

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
