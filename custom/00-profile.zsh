#!/usr/bin/env zsh

if [[ -x /opt/homebrew/bin/brew ]]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
elif [[ -x /usr/local/bin/brew ]]; then
  eval "$(/usr/local/bin/brew shellenv)"
fi

# Restore SSH keys whose passphrases were saved by `ssh-add --apple-use-keychain`.
# This also makes SSH-backed Git commit signing work before the first pull/push.
if [[ "$OSTYPE" == darwin* ]]; then
  /usr/bin/ssh-add --apple-load-keychain >/dev/null 2>&1
fi

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

# pnpm
export PNPM_HOME="$HOME/Library/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac
# pnpm end

# uv completion
eval "$(uv generate-shell-completion zsh)"

# opencode
export PATH="$HOME/.opencode/bin:$PATH"
#compdef opencode
###-begin-opencode-completions-###
#
# yargs command completion script
#
# Installation: opencode completion >> ~/.zshrc
#    or opencode completion >> ~/.zprofile on OSX.
#
_opencode_yargs_completions()
{
  local reply
  local si=$IFS
  IFS=$'
' reply=($(COMP_CWORD="$((CURRENT-1))" COMP_LINE="$BUFFER" COMP_POINT="$CURSOR" opencode --get-yargs-completions "${words[@]}"))
  IFS=$si
  if [[ ${#reply} -gt 0 ]]; then
    _describe 'values' reply
  else
    _default
  fi
}
if [[ "'${zsh_eval_context[-1]}" == "loadautofunc" ]]; then
  _opencode_yargs_completions "$@"
else
  compdef _opencode_yargs_completions opencode
fi
###-end-opencode-completions-###
