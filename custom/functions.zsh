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

# zj_link <session>
function zj_link() {
    local sess="$1"
  if [[ -z "$sess" ]]; then
    echo "Usage: $0 <session>"
    return 1
  fi

  local saved_layouts_dir="$ZELLIJ_CONFIG_DIR/layouts/_saved"
  local version=$(command zellij -V | sed -E 's/^zellij (.+)$/\1/')
  # https://github.com/zellij-org/zellij/blob/c72f3a712bfa92a4a80b4c1ad1dbe7669892a324/zellij-utils/src/consts.rs
  local cache_dir="$HOME/Library/Caches/org.Zellij-Contributors.Zellij/"
  local sess_info_caches_dir="$cache_dir/$version/session_info"
  local sess_info_cache_dir="$sess_info_caches_dir/$sess"
  local sess_cache_file="$sess_info_cache_dir/session-layout.kdl"
  echo "Linking \"$sess\" to \"$sess_cache_file\"..."
  mkdir -p "$sess_info_cache_dir"
  ln -sf "$saved_layouts_dir/$sess/session-layout.kdl" "$sess_cache_file"
}

function zj_link_all() {
  local saved_layouts_dir="$ZELLIJ_CONFIG_DIR/layouts/_saved"
  for saved_layout_file in "$saved_layouts_dir"/*/session-layout.kdl(N); do
    local sess="$(basename "$(dirname "$saved_layout_file")")"
    zj_link "$sess"
  done
}


# TODO: remove when fixed: https://github.com/zellij-org/zellij/issues/3151
function zj_fix() {
  # remove `start_suspended true` within `zsh` panes like:
  #   pane command="/usr/local/bin/zsh" cwd="path" focus=true size="50%" {
  #       args "-l"
  #       (// )start_suspended true
  #   }

  sed -zE 's/(pane command="[^"]*zsh" [^{]*\{[^}]*)start_suspended true([^}]*\})/\1\2/g'
}

function zj_save() {
  local session="$1"
  local sessions="$2"
  if [[ -z "$session" ]]; then
    echo "Usage: $0 <session> [sessions]"
    return 1
  fi
  if [[ -z "$sessions" ]]; then
    sessions=$(command zellij ls 2>/dev/null | grep -v EXITED | sed -E 's/^(.+) \[Created .*$/\1/' | sed 's/\x1B\[[0-9;]*[mK]//g')
  fi
  if [[ ! "$sessions" =~ "$session" ]]; then
    echo "Session '$session' does not exist"
    return 1
  fi


  local save_layout_dir="$ZELLIJ_CONFIG_DIR/layouts/_saved/$session"
  local save_layout_file="$save_layout_dir/$(date +%Y-%m-%d-%H-%M-%S-%N).save.kdl"
  echo "Saving \"$session\" to \"$save_layout_file\"..."
  mkdir -p "$save_layout_dir"
  command zellij --session "$session" action dump-layout | zj_fix >"$save_layout_file"
  ln -sf "$save_layout_file" "$save_layout_dir/session-layout.kdl"
  zj_link "$session"
}

function zj_save_all() {
  # `zellij ls` example output:
  # [32;1mexample 2[m [Created [35;1m17m 32s[m ago]
  # [32;1mexample 1[m [Created [35;1m18m 48s[m ago]
  # [32;1mexample[m [Created [35;1m15s[m ago] ([31;1mEXITED[m - attach to resurrect)

  local sessions=$(command zellij ls 2>/dev/null | grep -v EXITED | sed -E 's/^(.+) \[Created .*$/\1/' | sed 's/\x1B\[[0-9;]*[mK]//g')
  if [[ -z "$sessions" ]]; then
    echo "No sessions to save"
    return 1
  fi

  local saved_layouts_dir="$ZELLIJ_CONFIG_DIR/layouts/_saved"
  local save_layout_name="$(date +%Y-%m-%d-%H-%M-%S-%N).save.kdl"
  echo "$sessions" | while read -r sess; do
    zj_save "$sess" "$sessions"
  done
}

function zj_diff() {
  local session="$1"
  local sessions="$2"
  if [[ -z "$session" ]]; then
    echo "Usage: $0 <session> [sessions]"
    return 1
  fi
  if [[ -z "$sessions" ]]; then
    sessions=$(command zellij ls 2>/dev/null | grep -v EXITED | sed -E 's/^(.+) \[Created .*$/\1/' | sed 's/\x1B\[[0-9;]*[mK]//g')
  fi
  if [[ ! "$sessions" =~ "$session" ]]; then
    echo "Session '$session' does not exist"
    return 1
  fi

  local save_layout_dir="$ZELLIJ_CONFIG_DIR/layouts/_saved/$session"
  local save_layout_file="$save_layout_dir/session-layout.kdl"

  echo "Diffing \"$session\" to \"$save_layout_file\"..."
  git -P diff -u <(cat "$save_layout_file" 2>/dev/null) <(command zellij --session "$session" action dump-layout | zj_fix)
}

function zj_diff_all() {
  local sessions=$(command zellij ls 2>/dev/null | grep -v EXITED | sed -E 's/^(.+) \[Created .*$/\1/' | sed 's/\x1B\[[0-9;]*[mK]//g')
  if [[ -z "$sessions" ]]; then
    echo "No sessions to diff"
    return 1
  fi

  echo "$sessions" | while read -r sess; do
    echo
    zj_diff "$sess" "$sessions"
    echo
  done
}
