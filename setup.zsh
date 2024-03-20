#!/usr/bin/env zsh

mydir=${0:a:h}
myrelativetohomedir=$(realpath --relative-to=$HOME $mydir)

echo 'Installing packages...'
zsh $mydir/setup/packages.zsh

echo 'Setting up macOS...'
zsh $mydir/setup/macos.zsh

echo 'Next:'
echo "  - Sync dotfiles: \`~/$myrelativetohomedir/bin/dotfiles-sync --defaults-action import # --do\`"
echo '  - Login to:'
echo '    - Atuin: `atuin account login`'
echo '    - CodeWhisperer: `cw login`'
echo '    - VSCode'
echo '    - JetBrains Toolbox'
echo '  - Set up Brave'
echo '  - Import misc/Raycast.config'
echo '  - Restart your computer'
