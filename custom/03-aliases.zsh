#!/usr/bin/env zsh

# Shortcuts
alias cddl="cd ~/Downloads"
alias cddf="cd $DOTFILES"
alias cdd="cd ~/dev"

alias v=vim
alias vim=lvim

alias grep='grep --color=auto'

alias ls='eza'

alias cat='bat'
alias -g -- --help='--help 2>&1 | bat --language=help --style=plain'

alias lg=lazygit
alias zj=zellij

# Enable aliases to be sudo’ed
alias sudo='sudo '

# Browser
alias chrome='/Applications/Brave\ Browser.app/Contents/MacOS/Brave\ Browser'
alias brave='/Applications/Brave\ Browser.app/Contents/MacOS/Brave\ Browser'
alias zen='/Applications/Zen\ Browser.app/Contents/MacOS/zen'

# IP addresses
alias ip="dig +short myip.opendns.com @resolver1.opendns.com"
alias localip="ipconfig getifaddr en0"
alias ips="ifconfig -a | grep -o 'inet6\? \(addr:\)\?\s\?\(\(\([0-9]\+\.\)\{3\}[0-9]\+\)\|[a-fA-F0-9:]\+\)' | awk '{ sub(/inet6? (addr:)? ?/, \"\"); print }'"

# Clean up LaunchServices to remove duplicates in the “Open With” menu
alias lscleanup="/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -kill -r -domain local -domain system -domain user && killall Finder"

# Canonical hex dump; some systems have this symlinked
command -v hd >/dev/null || alias hd="hexdump -C"

# macOS has no `md5sum`, so use `md5` as a fallback
command -v md5sum >/dev/null || alias md5sum="md5"

# macOS has no `sha1sum`, so use `shasum` as a fallback
command -v sha1sum >/dev/null || alias sha1sum="shasum"

# Copy to clipboard
alias c="pbcopy"

# Recursively delete `.DS_Store` files
alias dscleanup="find . -type f -name '*.DS_Store' -ls -delete"

# Empty the Trash on all mounted volumes and the main HDD.
# Also, clear Apple’s System Logs to improve shell startup speed.
alias emptytrash="sudo rm -rfv ~/.Trash; sudo rm -rfv /private/var/log/asl/*.asl"

# Show/hide hidden files in Finder
alias show="defaults write com.apple.finder AppleShowAllFiles -bool true && killall Finder"
alias hide="defaults write com.apple.finder AppleShowAllFiles -bool false && killall Finder"

# PlistBuddy alias, because sometimes `defaults` just doesn’t cut it
alias plistbuddy="/usr/libexec/PlistBuddy"

# Intuitive map function
# For example, to list all directories that contain a certain file:
# find . -name .gitattributes | map dirname
alias map="xargs -n1"

# System sleep (when going AFK)
alias afk="pmset sleepnow"

# Reload the shell (i.e. invoke as a login shell)
alias reload="exec $SHELL -l"

# Print each PATH entry on a separate line
alias path='echo -e ${PATH//:/\\n}'

###############################################################################
# System                                                                      #
###############################################################################

alias rm="rm -i"
alias mv="mv -i"
alias cp="cp -i"
alias ln="ln -i"

###############################################################################
# Git                                                                         #
###############################################################################

# alias grb="git rebase --committer-date-is-author-date"
# alias grbm='grb $(git_main_branch)'
# alias grbd='grb $(git_develop_branch)'
# alias grbi='grb --interactive'
# alias grbo='grb --onto'
# alias grbom='grb origin/$(git_main_branch)'
# alias grbod='grb origin/$(git_develop_branch)'

alias gss="gsb"
