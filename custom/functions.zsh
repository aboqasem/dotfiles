#!/usr/bin/env zsh

# Create a new directory and enter it
function mkd() {
  mkdir -p "$@" && cd "$_" || exit
}

# Change working directory to the top-most Finder window location
function cdf() { # short for `cdfinder`
  cd "$(osascript -e 'tell app "Finder" to POSIX path of (insertion location as alias)')" || exit
}

# Determine size of a file or total size of a directory
function fs() {
  if du -b /dev/null >/dev/null 2>&1; then
    local arg=-sbh
  else
    local arg=-sh
  fi
  if [[ -n "$@" ]]; then
    du $arg -- "$@"
  else
    du $arg .[^.]* ./*
  fi
}

# Use Git’s colored diff when available
hash git &>/dev/null
if [ $? -eq 0 ]; then
  function diff() {
    git diff --no-index "$@"
  }
fi

# Create a data URL from a file
function dataurl() {
  local mimeType=$(file -b --mime-type "$1")
  if [[ $mimeType == text/* ]]; then
    mimeType="${mimeType};charset=utf-8"
  fi
  echo "data:${mimeType};base64,$(openssl base64 -in "$1" | tr -d '\n')"
}

# Start an HTTP server from a directory, optionally specifying the port
function server() {
  local port="${1:-8000}"
  sleep 1 && open "http://localhost:${port}/" &
  python3 -m http.server $port
}

# Compare original and gzipped file size
function gzcmp() {
  local origsize=$(wc -c <"$1")
  local gzipsize=$(gzip -c "$1" | wc -c)
  local ratio=$(echo "$gzipsize * 100 / $origsize" | bc -l)
  printf "orig: %d bytes\n" "$origsize"
  printf "gzip: %d bytes (%2.2f%%)\n" "$gzipsize" "$ratio"
}

# Run `dig` and display the most useful info
function digga() {
  dig +nocmd "$1" any +multiline +noall +answer
}

# `o` with no arguments opens the current directory, otherwise opens the given
# location
function o() {
  if [ $# -eq 0 ]; then
    open .
  else
    open "$@"
  fi
}
function _o() { _arguments "*: :($(ls .))"; }
compdef _o o

function tre() {
  tree -a -I '.git|node_modules|bower_components' --dirsfirst "$@" | less -FRNX
}

# https://unix.stackexchange.com/a/572990/423419
function gtre() {
  git ls-tree -r --name-only HEAD | tree --fromfile -a --dirsfirst "$@" | less -FRNX
}

# capture the output of a command so it can be retrieved with `ret`
function cap() {
  tee /tmp/capture.out
}

# remove the output of the most recent command that was captured with `cap`
function rmcap() {
  rm -f /tmp/capture.out
}

# return the output of the most recent command that was captured with `cap`
function ret() {
  cat /tmp/capture.out
}
