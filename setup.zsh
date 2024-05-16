#!/usr/bin/env zsh

mydir=${0:a:h}
myrelativetohomedir=$(realpath --relative-to=$HOME $mydir)

echo 'Installing packages...'
zsh $mydir/setup/packages.zsh

echo 'Setting up macOS...'
zsh $mydir/setup/macos.zsh

echo 'Next:'
echo "  - Sync dotfiles: \`~/$myrelativetohomedir/bin/dotsync --defaults-action import # --do\`"
echo '  - Login to:'
echo '    - Atuin: `atuin account login`'
echo '    - Amazon Q: `q login`'
echo '    - VSCode'
echo '    - JetBrains Toolbox'
echo '  - Set up Brave'
echo '  - Import misc/Raycast.config'
echo '  - Restart your computer'
