#!/usr/bin/env zsh

CURRENT_DIR=${0:a:h}
RELATIVE_TO_HOME=$(python3 -c "import os; print(os.path.relpath('$CURRENT_DIR', '$HOME'))")

echo 'Installing packages...'
zsh $CURRENT_DIR/setup/packages.zsh

echo 'Running dotsync...'
"$CURRENT_DIR/bin/dotsync" --defaults-action import # --do

echo 'Setting up macOS...'
zsh $CURRENT_DIR/setup/macos.zsh

echo 'Next:'
echo "  - Sync dotfiles: \`~/$RELATIVE_TO_HOME/bin/dotsync --defaults-action import # --do\`"
echo '  - Login to:'
echo '    - Atuin: `atuin account login`'
echo '    - VSCode'
echo '    - JetBrains Toolbox'
echo '  - Set up Zen Browser'
echo '  - Import misc/Raycast.config'
echo '  - Restart your computer'
