#!/usr/bin/env zsh

# Close any open System Settings panes, to prevent them from overriding
# settings we’re about to change
osascript -e 'tell application "System Settings" to quit'

# Ask for the administrator password upfront
sudo -v

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
sudo scutil --set ComputerName "Zouabi"
sudo scutil --set HostName "Zouabi"
sudo scutil --set LocalHostName "Zouabi"
sudo defaults write /Library/Preferences/SystemConfiguration/com.apple.smb.server NetBIOSName -string "Zouabi"

# Disable Gatekeeper (do not ask to run software downloaded from the internet)
sudo spctl --master-disable

# Disable the sound effects on boot
sudo nvram SystemAudioVolume=" "

# Remove duplicates in the “Open With” menu (also see `lscleanup` alias)
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -kill -r -domain local -domain system -domain user

# Show Bluetooth in the control center
defaults write com.apple.controlcenter NSStatusItem\ Visible\ Bluetooth -bool true

###############################################################################
# Keyboard and input                                                          #
###############################################################################

# Use scroll gesture with the Ctrl (^) modifier key to zoom
sudo defaults write com.apple.universalaccess closeViewScrollWheelToggle -bool true
sudo defaults write com.apple.universalaccess HIDScrollZoomModifierMask -int 262144
# Follow the keyboard focus while zoomed in
sudo defaults write com.apple.universalaccess closeViewZoomFollowsFocus -bool true

# TODO: NOT WORKING, FIX
# Disable "Show Spotlight search" keyboard shortcut (⌘Space), used for Raycast.app
/usr/libexec/PlistBuddy -c "Set :AppleSymbolicHotKeys:64:enabled false" ~/Library/Preferences/com.apple.symbolichotkeys.plist

# Show language menu in the top right corner of the boot screen
sudo defaults write /Library/Preferences/com.apple.loginwindow showInputMenu -bool true

###############################################################################
# Energy saving                                                               #
###############################################################################

# Enable lid wakeup
sudo pmset -a lidwake 1

# Restart automatically on power loss
sudo pmset -a autorestart 1

# Automatic graphics switching
sudo pmset -a gpuswitch 2

# Restart automatically if the computer freezes
sudo systemsetup -setrestartfreeze on

# Display sleep in minutes
sudo pmset -c displaysleep 15
sudo pmset -b displaysleep 3

# Machine sleep in minutes
sudo pmset -c sleep 0
sudo pmset -b sleep 5

# Disk sleep in minutes, should be less than or equal to machine sleep
sudo pmset -c disksleep 0
sudo pmset -b disksleep 5

# Set standby delay to 24 hours (default is 1 hour)
sudo pmset -a standbydelay 86400

# Never go into computer sleep mode
sudo systemsetup -setcomputersleep Off >/dev/null

# Hibernation mode
# 0: Disable hibernation (speeds up entering sleep mode)
# 3: Copy RAM to disk so the system state can still be restored in case of a
#    power failure.
sudo pmset -a hibernatemode 0

# Remove the sleep image file to save disk space
sudo rm -f /private/var/vm/sleepimage
# Create a zero-byte file instead…
sudo touch /private/var/vm/sleepimage
# …and make sure it can’t be rewritten
sudo chflags uchg /private/var/vm/sleepimage

###############################################################################
# Screen                                                                      #
###############################################################################

# Require password immediately after sleep or screen saver begins
defaults write com.apple.screensaver askForPassword -int 1
defaults write com.apple.screensaver askForPasswordDelay -int 0

# Create the screenshot destination
mkdir -p ~/Documents/Screenshots

# Enable HiDPI display modes (requires restart)
sudo defaults write /Library/Preferences/com.apple.windowserver DisplayResolutionEnabled -bool true

###############################################################################
# Finder                                                                      #
###############################################################################

# Show the ~/Library folder
chflags nohidden ~/Library && xattr -d com.apple.FinderInfo ~/Library

# Show the /Volumes folder
sudo chflags nohidden /Volumes

###############################################################################
# Dashboard and Launchpad                                                    #
###############################################################################

# Disable 'Displays have separate Spaces'
# https://nikitabobko.github.io/AeroSpace/guide#a-note-on-displays-have-separate-spaces
defaults write com.apple.spaces spans-displays -bool true

# Disable Dashboard
defaults write com.apple.dashboard mcx-disabled -bool true

# Reset Launchpad, but keep the desktop wallpaper intact
find "${HOME}/Library/Application Support/Dock" -maxdepth 1 -name "*-*.db" -delete

# Add iOS & Watch Simulator to Launchpad
sudo ln -sf "/Applications/Xcode.app/Contents/Developer/Applications/Simulator.app" "/Applications/Simulator.app"
sudo ln -sf "/Applications/Xcode.app/Contents/Developer/Applications/Simulator (Watch).app" "/Applications/Simulator (Watch).app"

###############################################################################
# Time Machine                                                                #
###############################################################################

# Disable local Time Machine backups
hash tmutil &>/dev/null && (sudo tmutil disablelocal 2>/dev/null || sudo tmutil disable)

###############################################################################
# Photos                                                                      #
###############################################################################

# Prevent Photos from opening automatically when devices are plugged in
defaults -currentHost write com.apple.ImageCapture disableHotPlug -bool true

###############################################################################
# Other                                                                       #
###############################################################################

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
  killall "${app}" &>/dev/null
done

echo "Done. Note that some of these changes require a logout/restart to take effect."
