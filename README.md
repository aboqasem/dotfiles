# Mohammad’s dotfiles

Personal macOS configuration for packages, shell tools, Git, application
preferences, and system settings.

## Set up a fresh Mac

Start from Terminal:

1. Install Apple’s Command Line Tools:

   ```zsh
   xcode-select --install
   ```

   Finish the installation dialog, then verify it:

   ```zsh
   xcode-select --print-path
   git --version
   ```

2. Clone the public repository over HTTPS. SSH is configured later:

   ```zsh
   git clone --recurse-submodules https://github.com/aboqasem/dotfiles.git ~/.dotfiles
   cd ~/.dotfiles
   ```

   The repository must be cloned at `~/.dotfiles`.

3. Install packages and restore the managed dotfiles:

   ```zsh
   zsh setup.zsh
   ```

   This installs Mise, language runtimes, Homebrew, and everything in
   `setup/Brewfile`. It then dry-runs `dotsync` to preview the changes.
   Sign in to the App Store before this step if the `mas` applications
   should install. If one Brewfile entry fails, remove or fix that
   entry and rerun the command.

   Review the output of `dotsync` and apply the changes after reviewing the output:

   ```zsh
   ./bin/dotsync --defaults-action import --do
   ```

   See [Use dotsync](#use-dotsync) for more details.

4. Scope the dotfiles repository to the personal Git and GitHub identity:

   ```zsh
   ~/.dotfiles/bin/git-identity personal --git-dir ~/.dotfiles
   ```

   The script asks for the Git author name and email, configures commit
   signing, and uses GitHub CLI to add the public key for both authentication
   and signing. Enter the SSH key passphrase when prompted; it is saved in the
   macOS Keychain and restored into Apple's SSH agent in new shell sessions.

   To configure only local Git and SSH files without changing GitHub, add
   `--local-only`. Rerun without that flag later to upload and verify the key.

   The initial clone uses HTTPS because SSH is not configured yet. After the
   identity setup succeeds, switch the repository to SSH so the scoped
   personal key is used:

   ```zsh
   git -C ~/.dotfiles remote set-url origin git@github.com:aboqasem/dotfiles.git
   git -C ~/.dotfiles push --dry-run
   ```

5. Optionally apply the opinionated macOS system settings after reviewing the
   script:

   ```zsh
   less setup/macos.zsh
   zsh setup/macos.zsh
   ```

   This is separate because it uses `sudo` and changes the computer name,
   Gatekeeper, power management, sleep behavior, and other system settings.

## Git and SSH identities

`git-identity` accepts any lowercase profile name, such as `personal`,
`client-1`, or `client-b`. Each profile gets these local, untracked files:

```text
~/.gitconfig-PROFILE
~/.ssh/id_ed25519_github_PROFILE
~/.ssh/config.d/github-PROFILE
```

The script also maintains `~/.gitconfig-identities`, which the synced global
Git configuration includes. Use `--default` for the fallback identity and
repeat `--git-dir` to scope the same profile to multiple directory trees:

```zsh
git-identity personal \
  --git-dir ~/.dotfiles \
  --git-dir ~/dev/personal
```

The directory itself does not have to exist yet. Paths are expanded to an
absolute physical path and apply recursively to repositories below them.

On a work Mac, make the company profile the default and scope personal work:

```zsh
git-identity client-1 --default
git-identity personal \
  --git-dir ~/.dotfiles \
  --git-dir ~/dev/personal
```

On a personal Mac, reverse the default and scope each company separately:

```zsh
git-identity personal --default
git-identity client-1 --git-dir ~/dev/work/client-1
```

Omit `--default` to keep repositories outside configured directories without
an identity. Each profile also sets its SSH key for Git operations, so a
scoped profile overrides the default identity and key together. HTTPS remotes
remain HTTPS; use an SSH remote when that key should authenticate.

### Reuse a copied key

To keep an existing identity, copy its private key from the old Mac or an
encrypted backup before running the identity setup. A Bitwarden attachment is
one possible encrypted transport; no Bitwarden SSH agent integration is used.

```zsh
install -d -m 700 ~/.ssh
cp /secure/location/id_ed25519 ~/.ssh/id_ed25519_github_personal
chmod 600 ~/.ssh/id_ed25519_github_personal
```

Copy the `.pub` file too when available. If only the private key is present,
the script derives the public key. Do not copy agent sockets or `known_hosts`
automatically.

### Add a profile to GitHub

Before uploading a key, the script shows the active GitHub CLI account.
Use `gh auth switch --hostname github.com` if the wrong account is active.

Clone with the matching host alias when the repository does not exist yet:

```zsh
git clone git@github-client-1:COMPANY/REPOSITORY.git ~/dev/work/client-1/REPOSITORY
```

After cloning into a scoped directory, a normal `git@github.com:` remote uses
the key selected by that directory's profile.

## Use `dotsync`

`dotsync` is a dry run unless `--do` is present. Its default macOS defaults
action is export, which captures current application preferences into the
repository.

Preview and capture current state:

```zsh
dotsync
dotsync --do
```

Preview and restore saved macOS defaults:

```zsh
dotsync --defaults-action import
dotsync --defaults-action import --do
```

The symlink reconciliation behavior is the same in both modes. Review the dry
run before applying changes on an existing machine.

## Return after a while

1. Update the repository and submodules:

   ```zsh
   cd ~/.dotfiles
   git pull --recurse-submodules
   ```

2. Preview the restored configuration:

   ```zsh
   dotsync --defaults-action import
   ```

3. Apply it after reviewing the output:

   ```zsh
   dotsync --defaults-action import --do
   ```

4. Verify the active identity and SSH connection:

   ```zsh
   git config --show-origin --get-regexp '^user\.'
   ssh -T git@github-personal
   ```

## Troubleshooting

- `xcrun: error`: finish `xcode-select --install`, then rerun setup.
- `brew: command not found`: rerun `zsh setup/packages.zsh`; it detects both
  Apple Silicon and Intel Homebrew prefixes.
- Brew bundle failure: edit the failing entry in `setup/Brewfile`, then rerun
  `zsh setup.zsh`.
- Wrong GitHub account: run `gh auth switch --hostname github.com`, then rerun
  the identity setup.
- Wrong Git identity: run `git config --show-origin --get-regexp
  '^(user\.|core\.sshcommand)'` inside the repository, then check
  `~/.gitconfig-identities`.
- Commit signing failure: check `git config --show-origin user.signingkey` and
  `ssh-add -l`. If the key is missing from the agent, save it to Keychain with
  `/usr/bin/ssh-add --apple-use-keychain ~/.ssh/id_ed25519_github_PROFILE`, then
  open a new shell. `synced/**/*.bak` contains recoverable dotsync backups when
  a backup was necessary.

## Local shell customization

All `*.zsh` files in `$DOTFILES/custom` are sourced by Oh My Zsh. Put private,
machine-specific shell configuration in `custom/other.zsh`; Git ignores it.

## Inspiration

- [`mathiasbynens/dotfiles`](https://github.com/mathiasbynens/dotfiles)
- [`driesvints/dotfiles`](https://github.com/driesvints/dotfiles)
- [`lra/mackup`](https://github.com/lra/mackup)
