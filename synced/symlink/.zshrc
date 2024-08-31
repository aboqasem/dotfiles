# Enable Powerlevel10k instant prompt. Should stay close to the top of ~/.zshrc.
# Initialization code that may require console input (password prompts, [y/n]
# confirmations, etc.) must go above this block; everything else may go below.
if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
  source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
fi

# mise, https://mise.jdx.dev/faq.html#what-does-mise-activate-do
eval "$(~/.local/bin/mise activate zsh)"
eval "$(mise hook-env)"

# theme
export ZSH_THEME=""

# Which plugins would you like to load?
export plugins=(
  git
  wakatime
)
if [[ $TERM_PROGRAM != "WarpTerminal" ]]; then
  plugins+=(
    zsh-syntax-highlighting
    zsh-autosuggestions
    fzf-tab
  )
fi

# Path to your dotfiles.
export DOTFILES="$HOME/dev/dotfiles"

# Path to your oh-my-zsh installation.
export ZSH="$HOME/.oh-my-zsh"

# Path to your custom oh-my-zsh dir.
export ZSH_CUSTOM="$DOTFILES/custom"

# Uncomment the following line to disable auto-setting terminal title.
export DISABLE_AUTO_TITLE="true"

# Uncomment the following line to display red dots whilst waiting for completion.
export COMPLETION_WAITING_DOTS="true"

# Uncomment the following line if pasting URLs and other text is messed up.
# export DISABLE_MAGIC_FUNCTIONS="true"

# Uncomment the following line if you want to disable marking untracked files
# under VCS as dirty. This makes repository status check for large repositories
# much, much faster.
export DISABLE_UNTRACKED_FILES_DIRTY="true"

# Disable automatic widget re-binding on each precmd
export ZSH_AUTOSUGGEST_MANUAL_REBIND="true"

zstyle ':omz:update' mode disabled
zstyle ':completion:*' menu no
zstyle ':fzf-tab:complete:cd:*' fzf-preview 'eza -1 --color=always $realpath'

# Load oh-my-zsh
[[ ! -f "$ZSH/oh-my-zsh.sh" ]] || source "$ZSH/oh-my-zsh.sh"

# To customize prompt, run `p10k configure` or edit ~/.p10k.zsh.
[[ ! -f ~/.p10k.zsh ]] || source ~/.p10k.zsh

[[ ! -f $ZSH_CUSTOM/themes/powerlevel10k/powerlevel10k.zsh-theme ]] || source $ZSH_CUSTOM/themes/powerlevel10k/powerlevel10k.zsh-theme

# https://github.com/oven-sh/bun/issues/12308#issuecomment-2204858086 :(
# bun completions
