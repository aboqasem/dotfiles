#!/usr/bin/env zsh

setopt ERR_EXIT PIPE_FAIL

typeset -g approve_all=false
typeset -gr script_name="${0:t}"
typeset -g color_cyan=""
typeset -g color_dim=""
typeset -g color_green=""
typeset -g color_red=""
typeset -g color_reset=""
typeset -g color_yellow=""

if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  color_cyan=$'\e[1;36m'
  color_dim=$'\e[2m'
  color_green=$'\e[1;32m'
  color_red=$'\e[1;31m'
  color_reset=$'\e[0m'
  color_yellow=$'\e[1;33m'
fi

usage() {
  printf 'Usage: %s [--yes]\n' "${script_name}"
  printf '  -y, --yes  Apply every change without prompting.\n'
}

while (( $# )); do
  case "$1" in
    -y|--yes)
      approve_all=true
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf '%sUnknown option:%s %s\n' "${color_red}" "${color_reset}" "$1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift
done

log_command() {
  local argument

  printf '    %s$' "${color_dim}"
  for argument in "$@"; do
    if [[ -n "${argument}" && "${argument}" != *[^A-Za-z0-9_@%+=:,./-]* ]]; then
      printf ' %s' "${argument}"
    else
      printf ' %s' "${(qq)argument}"
    fi
  done
  printf '%s\n' "${color_reset}"
}

log_action() {
  printf '\n%s==>%s %s\n' "${color_cyan}" "${color_reset}" "$1"
}

confirm_change() {
  [[ "${approve_all}" == true ]] && return 0

  if [[ ! -t 0 ]]; then
    printf '%sError:%s Interactive confirmation requires a terminal; rerun with --yes for unattended use.\n' \
      "${color_red}" "${color_reset}" >&2
    exit 2
  fi

  local reply
  while true; do
    read -r "reply?    ${color_yellow}Apply this change?${color_reset} ${color_dim}[y/n/a/q]${color_reset} " \
      </dev/tty || exit 130

    case "${reply:l}" in
      y|yes)
        return 0
        ;;
      n|no)
        printf '    %sSkipped.%s\n' "${color_yellow}" "${color_reset}"
        return 1
        ;;
      a|all)
        approve_all=true
        printf '    %sApplying all remaining changes without prompting.%s\n' \
          "${color_green}" "${color_reset}"
        return 0
        ;;
      q|quit)
        printf '%sAborted.%s\n' "${color_red}" "${color_reset}"
        exit 130
        ;;
    esac
  done
}

run_preflight() {
  local description="$1"
  shift

  log_action "${description}"
  log_command "$@"
  "$@"
}

run_preflight_quietly() {
  local description="$1"
  shift

  log_action "${description}"
  log_command "$@"
  "$@" &>/dev/null
}

run() {
  local description="$1"
  shift

  log_action "${description}"
  log_command "$@"
  if ! confirm_change; then
    return 0
  fi
  "$@"
}

run_quietly() {
  local description="$1"
  shift

  log_action "${description}"
  log_command "$@"
  if ! confirm_change; then
    return 0
  fi
  "$@" &>/dev/null
}

skip() {
  log_action "$1"
  printf '    %sSkipped:%s %s\n' "${color_yellow}" "${color_reset}" "$2"
}

change_setting() {
  local description="$1"
  local setting="$2"
  local newline_indent=$'\n    '
  local previous_value
  local -a getter setter
  shift 2

  while (( $# )) && [[ "$1" != "--" ]]; do
    getter+=("$1")
    shift
  done

  if (( $# == 0 )); then
    printf '%sError:%s change_setting is missing the -- separator for %s\n' \
      "${color_red}" "${color_reset}" "${setting}" >&2
    return 2
  fi

  shift
  setter=("$@")

  log_action "${description}"
  log_command "${getter[@]}"
  if previous_value="$("${getter[@]}" 2>/dev/null)"; then
    [[ -n "${previous_value}" ]] || previous_value="<empty>"
  else
    previous_value="<not set or unavailable>"
  fi
  previous_value="${previous_value//$'\n'/${newline_indent}}"
  printf '    %sPrevious %s:%s %s\n' \
    "${color_yellow}" "${setting}" "${color_reset}" "${previous_value}"
  log_command "${setter[@]}"
  if ! confirm_change; then
    return 0
  fi
  "${setter[@]}"
}

set_scutil() {
  local key="$1"
  local value="$2"
  change_setting "Setting ${key} to ${value}." "${key}" \
    scutil --get "${key}" -- \
    sudo scutil --set "${key}" "${value}"
}

set_defaults() {
  local domain="$1"
  local key="$2"
  local type="$3"
  local value="$4"
  local privilege="${5:-user}"
  local -a prefix

  [[ "${privilege}" == "system" ]] && prefix=(sudo)
  change_setting "Setting ${domain}:${key} to ${value}." "${domain}:${key}" \
    "${prefix[@]}" defaults read "${domain}" "${key}" -- \
    "${prefix[@]}" defaults write "${domain}" "${key}" "-${type}" "${value}"
}

set_current_host_default() {
  local domain="$1"
  local key="$2"
  local type="$3"
  local value="$4"
  change_setting "Setting the current host's ${domain}:${key} to ${value}." "${domain}:${key}" \
    defaults -currentHost read "${domain}" "${key}" -- \
    defaults -currentHost write "${domain}" "${key}" "-${type}" "${value}"
}

get_pmset_value() {
  local scope="$1"
  local key="$2"

  pmset -g custom | awk -v scope="${scope}" -v key="${key}" '
    /^[^[:space:]].*:$/ {
      profile = $0
      sub(/:$/, "", profile)
    }
    $1 == key && (scope == "-a" ||
      (scope == "-b" && profile == "Battery Power") ||
      (scope == "-c" && profile == "AC Power")) {
      print profile ": " $2
    }
  '
}

pmset_supports() {
  local key="$1"

  pmset -g custom | awk -v key="${key}" '
    $1 == key {
      found = 1
      exit
    }
    END {
      exit !found
    }
  '
}

set_pmset() {
  local scope="$1"
  local key="$2"
  local value="$3"
  local scope_description

  case "${scope}" in
    -a) scope_description="all power sources" ;;
    -b) scope_description="battery power" ;;
    -c) scope_description="charger power" ;;
    *) scope_description="scope ${scope}" ;;
  esac

  change_setting "Setting pmset ${key} to ${value} for ${scope_description}." \
    "pmset ${scope} ${key}" \
    get_pmset_value "${scope}" "${key}" -- \
    sudo pmset "${scope}" "${key}" "${value}"
}

set_systemsetup() {
  local setting="$1"
  local value="$2"
  change_setting "Setting systemsetup ${setting} to ${value}." "systemsetup ${setting}" \
    sudo systemsetup "-get${setting}" -- \
    sudo systemsetup "-set${setting}" "${value}"
}

install_application_symlink() {
  local application="$1"
  local source="$2"
  local destination="$3"

  if [[ -e "${source}" ]]; then
    if [[ -L "${destination}" ]]; then
      change_setting "Linking ${application} into /Applications." "${destination} target" \
        readlink "${destination}" -- \
        sudo ln -sfn "${source}" "${destination}"
    elif [[ -e "${destination}" ]]; then
      skip "Linking ${application} into /Applications." \
        "${destination} already exists and is not a symlink."
    else
      run "Linking ${application} into /Applications." \
        sudo ln -s "${source}" "${destination}"
    fi
  elif [[ -L "${destination}" ]]; then
    change_setting "Removing the stale ${application} symlink." "${destination} target" \
      readlink "${destination}" -- \
      sudo rm "${destination}"
  else
    skip "Linking ${application} into /Applications." \
      "The source application does not exist at ${source}."
  fi
}

# Close any open System Settings panes, to prevent them from overriding
# settings we’re about to change
run "Closing System Settings so it cannot overwrite these changes." \
  osascript -e 'tell application "System Settings" to quit'

# Ask for the administrator password upfront
run_preflight "Requesting administrator credentials for system-wide changes." sudo -v
if ! run_preflight_quietly "Verifying that the sudo credential can be reused without another prompt." \
  sudo -n true; then
  printf '    %sWarning:%s sudo credential reuse is disabled; privileged commands may prompt again.\n' \
    "${color_red}" "${color_reset}" >&2
fi

# Keep-alive: update existing `sudo` time stamp until `.macos` has finished
while true; do
  sudo -n true
  sleep 60
  kill -0 "$$" || exit
done 2>/dev/null &

###############################################################################
# General UI/UX                                                               #
###############################################################################

# Set computer name (as done via System Settings → Sharing)
set_scutil ComputerName "Zouabi"
set_scutil HostName "Zouabi"
set_scutil LocalHostName "Zouabi"
set_defaults /Library/Preferences/SystemConfiguration/com.apple.smb.server NetBIOSName string "Zouabi" system

# Disable the sound effects on boot
change_setting "Disabling the startup sound." "NVRAM SystemAudioVolume" \
  sudo nvram SystemAudioVolume -- \
  sudo nvram 'SystemAudioVolume= '

# Remove duplicates in the “Open With” menu (also see `lscleanup` alias)
run "Rebuilding the Launch Services database to remove duplicate Open With entries." \
  /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
  -gc -r -domain local -domain system -domain user

# Show language menu in the top right corner of the boot screen
set_defaults /Library/Preferences/com.apple.loginwindow showInputMenu bool true system

###############################################################################
# Energy saving                                                               #
###############################################################################

# Enable lid wakeup
set_pmset -a lidwake 1

# Restart automatically on power loss
set_pmset -a autorestart 1

# Automatic graphics switching
if pmset_supports gpuswitch; then
  set_pmset -a gpuswitch 2
else
  skip "Configuring automatic graphics switching." \
    "This Mac does not expose the gpuswitch setting."
fi

# Restart automatically if the computer freezes
set_systemsetup restartfreeze on

# Display sleep in minutes
set_pmset -c displaysleep 15
set_pmset -b displaysleep 3

# Machine sleep in minutes
set_pmset -c sleep 0
set_pmset -b sleep 5

# Disk sleep in minutes, should be less than or equal to machine sleep
set_pmset -c disksleep 0
set_pmset -b disksleep 5

# Set standby delay to 24 hours (default is 1 hour)
set_pmset -a standbydelay 86400

# Never go into computer sleep mode
set_systemsetup computersleep Off

# Hibernation mode
# 0: Disable hibernation (speeds up entering sleep mode)
# 3: Copy RAM to disk so the system state can still be restored in case of a
#    power failure.
set_pmset -a hibernatemode 0

# Remove the sleep image file to save disk space
if [[ -e /private/var/vm/sleepimage ]]; then
  change_setting "Unlocking the existing sleep image so it can be replaced." \
    "/private/var/vm/sleepimage flags" \
    ls -ldO /private/var/vm/sleepimage -- \
    sudo chflags nouchg /private/var/vm/sleepimage
fi
run "Removing the existing sleep image to reclaim disk space." \
  sudo rm -f /private/var/vm/sleepimage
# Create a zero-byte file instead…
run "Creating an empty sleep image placeholder." \
  sudo touch /private/var/vm/sleepimage
# …and make sure it can’t be rewritten
run "Locking the sleep image placeholder against changes." \
  sudo chflags uchg /private/var/vm/sleepimage

###############################################################################
# Screen                                                                      #
###############################################################################

# Create the screenshot destination
run "Creating the Screenshots directory if it does not exist." \
  mkdir -p "${HOME}/Documents/Screenshots"

# Enable HiDPI display modes (requires restart)
set_defaults /Library/Preferences/com.apple.windowserver DisplayResolutionEnabled bool true system

###############################################################################
# Finder                                                                      #
###############################################################################

# Show the ~/Library folder
run "Making the user Library directory visible." chflags nohidden "${HOME}/Library"
if xattr -p com.apple.FinderInfo "${HOME}/Library" &>/dev/null; then
  change_setting "Removing Finder's hidden metadata from the user Library directory." \
    "${HOME}/Library com.apple.FinderInfo" \
    xattr -p com.apple.FinderInfo "${HOME}/Library" -- \
    xattr -d com.apple.FinderInfo "${HOME}/Library"
else
  skip "Checking Finder metadata on the user Library directory." \
    "com.apple.FinderInfo is already absent."
fi

# Show the /Volumes folder
run "Making the /Volumes directory visible." sudo chflags nohidden /Volumes

###############################################################################
# Launchpad                                                    #
###############################################################################

# Reset Launchpad, but keep the desktop wallpaper intact
launchpad_database_dir="${HOME}/Library/Application Support/Dock"
if [[ -d "${launchpad_database_dir}" ]]; then
  run "Resetting the Launchpad database while preserving the desktop wallpaper." \
    find "${launchpad_database_dir}" -maxdepth 1 -name "*-*.db" -delete
else
  skip "Checking for a Launchpad database to reset." \
    "${launchpad_database_dir} does not exist yet."
fi

# Add iOS & Watch Simulator to Launchpad
install_application_symlink "iOS Simulator" \
  "/Applications/Xcode.app/Contents/Developer/Applications/Simulator.app" \
  "/Applications/Simulator.app"
install_application_symlink "Watch Simulator" \
  "/Applications/Xcode.app/Contents/Developer/Applications/Simulator (Watch).app" \
  "/Applications/Simulator (Watch).app"

###############################################################################
# Time Machine                                                                #
###############################################################################

# Disable local Time Machine backups
if (( $+commands[tmutil] )); then
  if ! change_setting "Disabling local Time Machine snapshots." "Time Machine status" \
    sudo tmutil status -- \
    sudo tmutil disablelocal; then
    change_setting "The legacy command failed; disabling Time Machine with the current command." \
      "Time Machine status" \
      sudo tmutil status -- \
      sudo tmutil disable
  fi
fi

###############################################################################
# Photos                                                                      #
###############################################################################

# Prevent Photos from opening automatically when devices are plugged in
set_current_host_default com.apple.ImageCapture disableHotPlug bool true

###############################################################################
# Other                                                                       #
###############################################################################

run "Recursively clearing extended attributes from InstantSpaceSwitcher." \
  xattr -cr /Applications/InstantSpaceSwitcher.app

###############################################################################
# Kill affected applications                                                  #
###############################################################################

for app in "Activity Monitor" \
  "Calendar" \
  "Dock" \
  "Finder" \
  "Mail" \
  "Messages" \
  "Photos" \
  "SystemUIServer"; do
  if ! run_quietly "Restarting ${app} so changed settings take effect." killall "${app}"; then
    printf '    %sSkipped:%s %s is not currently running.\n' \
      "${color_yellow}" "${color_reset}" "${app}"
  fi
done

printf '\n%sDone.%s Some changes require a logout or restart to take effect.\n' \
  "${color_green}" "${color_reset}"
