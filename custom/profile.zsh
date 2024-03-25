#!/usr/bin/env zsh

# Homebrew completions
fpath+=~/.zfunc
if type brew &>/dev/null; then
  FPATH=$(brew --prefix)/share/zsh/site-functions:$FPATH

  autoload -Uz compinit
  compinit
fi

# atuin init
[[ $TERM_PROGRAM != "WarpTerminal" ]] && eval "$(atuin init zsh --disable-up-arrow)"

# bun completions
[ -s "$HOME/.bun/_bun" ] && source "$HOME/.bun/_bun"
