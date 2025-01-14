#!/usr/bin/env bash

# better defaults when dealing with bash scripts: https://gist.github.com/mohanpedala/1e2ff5661761d3abd0385e8223e16425
set -e          # immediately exit script on any command error
set -u          # treat unset variables as an error
set -o pipefail # exit if any piped command fails
DEBUG=${DEBUG:-}
if [ -n "$DEBUG" ]; then
  set -x # print all executed commands to stdout
fi

EMAIL="${1:?"Usage: $0 <your-email-address>"}"

KEY_TYPE="ed25519"
KEY_NAME="id_$KEY_TYPE"

echo "Generating a new SSH key for GitHub..."

# Generating a new SSH key
# https://docs.github.com/en/github/authenticating-to-github/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent#generating-a-new-ssh-key
ssh-keygen -t "$KEY_TYPE" -C "$EMAIL" -f ~/.ssh/"$KEY_NAME"

# Adding your SSH key to the ssh-agent
# https://docs.github.com/en/github/authenticating-to-github/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent#adding-your-ssh-key-to-the-ssh-agent
eval "$(ssh-agent -s)"

{
  echo "Host github.com"
  echo " AddKeysToAgent yes"
  echo " UseKeychain yes"
  echo " IdentityFile ~/.ssh/$KEY_NAME"
} >>~/.ssh/config

ssh-add -K ~/.ssh/"$KEY_NAME"

echo "$EMAIL namespaces=\"git\" $(cat ~/.ssh/"$KEY_NAME".pub)" >>~/.ssh/allowed_signers

# Adding your SSH key to your GitHub account
# https://docs.github.com/en/github/authenticating-to-github/adding-a-new-ssh-key-to-your-github-account
echo "Run 'pbcopy < ~/.ssh/$KEY_NAME.pub' and paste that into GitHub"
