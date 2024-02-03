#!/usr/bin/env zsh

# Path to your oh-my-zsh installation.
export ZSH=~/.oh-my-zsh

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

# Make Python use UTF-8 encoding for output to stdin, stdout, and stderr.
export PYTHONIOENCODING='UTF-8'

# Increase Bash history size. Allow 32³ entries; the default is 500.
export HISTSIZE='32768'
export HISTFILESIZE="${HISTSIZE}"
# Omit duplicates and commands that begin with a space from history.
export HISTCONTROL='ignoreboth'

export EDITOR=vim
export VISUAL=vim

export CHROME_EXECUTABLE="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"

# Prefer US English and use UTF-8.
export LANG='en_US.UTF-8'
export LC_ALL='en_US.UTF-8'

# Highlight section titles in manual pages.
export LESS_TERMCAP_md="${yellow}"

# Don’t clear the screen after quitting a manual page.
export MANPAGER='less -X'

# Avoid issues with `gpg` as installed via Homebrew.
# https://stackoverflow.com/a/42265848/96656
export GPG_TTY=$(tty)

# Do not auto update Homebrew
export HOMEBREW_NO_AUTO_UPDATE=1

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
