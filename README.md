# Mohammad’s dotfiles

## Setting up a fresh Mac

1. [Generate a new public and private SSH key](https://docs.github.com/en/github/authenticating-to-github/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent) by running:

   ```zsh
   curl https://raw.githubusercontent.com/aboqasem/dotfiles/HEAD/ssh.sh | sh -s "<your-email-address>"
   ```

2. Clone this repo to `~/dev/dotfiles` with:

    ```zsh
    mkdir -p ~/dev && git clone --recursive git@github.com:aboqasem/dotfiles.git ~/dev/dotfiles
    ```

3. Run the installation with:

    ```zsh
    cd ~/dev/dotfiles && zsh setup.sh
    ```

4. Restart your computer to finalize the process

## Keeping up to date

Run the sync script frequently:

```zsh
dotfiles-sync
```

## Tips

- All `*.zsh` files in `$DOTFILES/custom` will be sourced by [`oh-my-zsh`][oh-my-zsh]. Use `custom/other.zsh` to add custom things that should not be committed.

## Inspiration

- [`mathiasbynens/dotfiles`](https://github.com/mathiasbynens/dotfiles)
- [`driesvints/dotfiles`](https://github.com/driesvints/dotfiles)
- [`lra/mackup`](https://github.com/lra/mackup)

[oh-my-zsh]: https://ohmyz.sh/
