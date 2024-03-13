#!/usr/bin/env zsh

# Make Python use UTF-8 encoding for output to stdin, stdout, and stderr.
export PYTHONIOENCODING=UTF-8

# Increase Bash history size. Allow 32³ entries; the default is 500.
export HISTSIZE=32768
export HISTFILESIZE=$HISTSIZE
# Omit duplicates and commands that begin with a space from history.
export HISTCONTROL='ignoreboth'

export EDITOR=vim
export VISUAL=vim

export CHROME_EXECUTABLE="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"

# Prefer US English and use UTF-8.
export LANG='en_US.UTF-8'
export LC_ALL='en_US.UTF-8'

# Highlight section titles in manual pages.
export LESS_TERMCAP_md=$YELLOW

# Don’t clear the screen after quitting a manual page.
export MANPAGER="sh -c 'col -bx | bat -l man -p'"

# Avoid issues with `gpg` as installed via Homebrew.
# https://stackoverflow.com/a/42265848/96656
export GPG_TTY=$TTY

# Do not auto update Homebrew
export HOMEBREW_NO_AUTO_UPDATE=1
