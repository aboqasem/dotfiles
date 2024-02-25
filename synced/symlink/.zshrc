# theme
export ZSH_THEME="aboqasem"

# Which plugins would you like to load?
export plugins=(
  git
  zsh-syntax-highlighting
  zsh-autosuggestions
  you-should-use
  timer
)

# `timer` plugin
export TIMER_FORMAT="[%d]"

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

# Load oh-my-zsh
source "$ZSH/oh-my-zsh.sh"
