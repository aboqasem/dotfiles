#!/usr/bin/env zsh

cd "$(dirname "${ZSH_SOURCE}")" || exit

git pull origin main

function doIt() {
  rsync --exclude ".git/" \
    --exclude ".DS_Store" \
    --exclude "bootstrap.sh" \
    --exclude "README.md" \
    --exclude "LICENSE-MIT.txt" \
    -avh --no-perms . ~
  source ~/.zsh_profile
}

if [ "$1" = "--force" -o "$1" = "-f" ]; then
  doIt
else
  read "REPLY?This may overwrite existing files in your home directory. Are you sure? (y/n) "
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    doIt
  fi
fi
unset doIt
