# Amazon Q pre block. Keep at the top of this file.
[[ $TERM_PROGRAM != "WarpTerminal" ]] && [[ -f "${HOME}/Library/Application Support/amazon-q/shell/zprofile.pre.zsh" ]] && builtin source "${HOME}/Library/Application Support/amazon-q/shell/zprofile.pre.zsh"

# Amazon Q post block. Keep at the bottom of this file.
[[ $TERM_PROGRAM != "WarpTerminal" ]] && [[ -f "${HOME}/Library/Application Support/amazon-q/shell/zprofile.post.zsh" ]] && builtin source "${HOME}/Library/Application Support/amazon-q/shell/zprofile.post.zsh"
