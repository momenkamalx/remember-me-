<p align="center">
  <img src="https://github.com/user-attachments/assets/14967e52-6cfb-4ff1-b24a-50e5aa5c1415" alt="Remember Me Icon" width="140" height="140">
</p>

# Remember Me?

A small private reminder app for Windows and Linux. Type what you want to be reminded about, pick a date and time, and a popup with a sound appears when it is due. Everything stays on your computer: no account nor cloud and no internet needed.

## Features
- Reminders with a date, a time, and an optional repeat (daily, weekly, monthly)
- Optional link on a reminder, with an **Open** button on the popup
- Edit, mark Done, Snooze, Delete, Toggel a 24h fromat(off by default).
- Alert when a reminder is due, with a sound that repeats until you react: a popup in the bottom-right corner on Windows, a system notification on Linux (with Done / Snooze / Open buttons where your desktop supports them)
- Sound settings: Silent, Chime, Bell, Beep, Digital, Soft, or upload your own file; volume; how many times it repeats; test and stop buttons
- Global hotkey (default **Alt+X**) to open the app; change it in Settings
- Lives in the system tray, starts with your computer (you can turn this off), asks before quitting
- Search for it by typing **rm**, **remember** or **reminder** in your Start menu or app launcher
- Browser companion for Firefox, Chrome, Brave and Edge (optional, see below)
- Your reminders are stored only on your computer

## HOW TO USE
1. Open the app, type what you want to remember, pick a date and time, and press **Add reminder**.
2. When it is due you get an alert with a sound (a popup on Windows, a system notification on Linux). Press **Done**, **Snooze**, or **Open** (if the reminder has a link).
3. Open **Settings** to change the sound, volume, repeat count, hotkey, and whether it starts with your computer.
4. Closing the window hides it to the tray; reminders keep working. To fully quit, right-click the tray icon -> **Quit**. Quitting stops reminders until you start the app again.

Your reminders are stored in a small database on your computer:
- Windows: `%APPDATA%\com.rememberme.app\`
- Linux: `~/.local/share/com.rememberme.app/`

## Browser companion (optional)
A small add-on for Firefox, Chrome, Brave and Edge that sends reminders from your browser to the app. **The Remember Me? app must be installed and running.**

- Right-click selected text, a link, or a page: **Remind me about this**
- **Read this page later** in one click (in 1 hour, tonight, tomorrow). The link is saved, and the reminder popup gets an **Open** button.
- Quick add from the toolbar button or with `Alt+Shift+X`

**Firefox:** approved by Mozilla. Install it from the Firefox Add-ons site: search for **Remember Me? (browser companion)** and click **Add to Firefox**.

**Chrome, Brave, Edge:** download `remember-me-chrome-extension.zip` from the [Releases page](https://github.com/momenkamalx/remember-me-/releases) and install it in developer mode (a Chrome Web Store version will come later). Step-by-step instructions are in [`browser-extension/README.md`](browser-extension/README.md).

## limits(for now)
- On Windows the popup cannot draw over games in true exclusive fullscreen. The sound still plays.
- The Windows installer is not code-signed, so Windows shows a warning the first time.
- Tested on Windows and on virtual Linux desktops. Not yet tested on real GNOME, KDE or Hyprland.

## Install on Windows (10 and 11)
1. Open the [Releases page](https://github.com/momenkamalx/remember-me-/releases) and download the file ending in **`x64-setup.exe`** from the newest release.
2. Double-click it. If Windows shows "Windows protected your PC", click **More info**, then **Run anyway** (the installer is not code-signed yet).
3. Open **Remember Me** from the Start menu, or press the Windows key and type `rm`.

To update, install the newer `setup.exe` over the old one. Your reminders are kept.
To remove it: **Settings -> Apps -> Remember Me -> Uninstall**.

### Install on Windows from the command line
Open **PowerShell** and run:
```powershell
$r = Invoke-RestMethod https://api.github.com/repos/momenkamalx/remember-me-/releases/latest
$a = $r.assets | Where-Object { $_.name -like "*setup.exe" } | Select-Object -First 1
Invoke-WebRequest $a.browser_download_url -OutFile Remember-Me-Setup.exe
Start-Process .\Remember-Me-Setup.exe -ArgumentList "/S" -Wait
```
`/S` installs silently. Start it from the Start menu afterwards.

Uninstall from the command line (default per-user install location):
```powershell
& "$env:LOCALAPPDATA\Remember Me\uninstall.exe" /S
```

## Install on Linux
You need a 64-bit Intel/AMD computer. Supported: Ubuntu 22.04+, Debian 12+, Linux Mint, Pop!_OS, Fedora, openSUSE, Arch, Manjaro, Omarchy and most other mainstream distros. Very old distros (for example Ubuntu 20.04) and ARM computers (such as a Raspberry Pi) are not supported.

Download from the [Releases page](https://github.com/momenkamalx/remember-me-/releases) the file for your distro:

| Your distro | Download |
|---|---|
| Ubuntu, Debian, Linux Mint, Pop!_OS | the **`.deb`** file |
| Fedora, openSUSE | the **`.rpm`** file |
| Arch, Manjaro, Omarchy, anything else | the **`.AppImage`** file |

### With the mouse
- **`.deb` / `.rpm`:** double-click the file. Your software installer opens; click **Install**.
- **`.AppImage`:** right-click the file -> **Properties** -> **Permissions** -> tick **Allow executing as a program**, then double-click it. (On Arch you also need the `fuse2` package.)

Then start **Remember Me** from your app menu, or search for `rm`.

### From the command line
Open a terminal in the folder where you saved the file. The file name starts with `Remember` (it may contain a space or a dot, so keep the `*`).

**Ubuntu, Debian, Mint, Pop!_OS:**
```
sudo apt install ./Remember*.deb
```
**Fedora, openSUSE:**
```
sudo dnf install ./Remember*.rpm
```
**Arch, Manjaro, Omarchy and others:**
```
chmod +x ./Remember*.AppImage
./Remember*.AppImage
```
On Arch: `sudo pacman -S fuse2` first. If FUSE is not available: `./Remember*.AppImage --appimage-extract-and-run`.

**Download and install in one go** (no browser needed; pick the line block for your distro):
```
# Ubuntu / Debian / Mint / Pop!_OS
curl -s https://api.github.com/repos/momenkamalx/remember-me-/releases/latest | grep -o 'https://[^"]*\.deb' | head -1 | xargs curl -L -o remember-me.deb
sudo apt install ./remember-me.deb

# Fedora / openSUSE
curl -s https://api.github.com/repos/momenkamalx/remember-me-/releases/latest | grep -o 'https://[^"]*\.rpm' | head -1 | xargs curl -L -o remember-me.rpm
sudo dnf install ./remember-me.rpm

# Arch / Manjaro / Omarchy / others (AppImage)
curl -s https://api.github.com/repos/momenkamalx/remember-me-/releases/latest | grep -o 'https://[^"]*\.AppImage' | head -1 | xargs curl -L -o remember-me.AppImage
chmod +x remember-me.AppImage
./remember-me.AppImage
```
After a `.deb` or `.rpm` install you can also start it with the command `remember-me`.

**Remove it:**
- Ubuntu / Debian / Mint / Pop!_OS: `sudo apt remove remember-me`
- Fedora / openSUSE: `sudo dnf remove remember-me`
- AppImage: delete the file.

If you turned on "Start with the computer", also delete the Remember Me entry in `~/.config/autostart/`.

### Linux tips
- **Started it from a terminal?** You can close the terminal: the app detaches itself and keeps running (and your prompt comes back right away). To quit it, use the tray icon -> **Quit**, or run `pkill -x remember-me`. To keep it attached to the terminal, for example to see error messages, start it with `RM_FOREGROUND=1 remember-me`.
- **No tray icon on GNOME?** GNOME hides tray icons unless the *AppIndicator* extension is installed (`gnome-shell-extension-appindicator`; Ubuntu includes it). Without it, closing the window hides the app: open it again from your app menu. Reminders keep working.
- **Alt+X does nothing on Wayland (Hyprland, Omarchy, GNOME)?** Global hotkeys are blocked there. Instead add a shortcut in your system's keyboard settings that runs `remember-me` (running it again just shows the window). On Hyprland / Omarchy add a line such as `bind = SUPER ALT, R, exec, remember-me` to your key bindings.
- **Using the AppImage?** Put it where the system can find it first, so the command `remember-me` exists:
  ```
  mkdir -p ~/.local/bin
  mv ./Remember*.AppImage ~/.local/bin/remember-me
  chmod +x ~/.local/bin/remember-me
  ```
  Then use `~/.local/bin/remember-me` in your shortcut if `~/.local/bin` is not on your PATH.
- **Notifications:** on Linux a reminder is a normal system notification. Buttons (Done, Snooze, Open) appear where your notification service supports them. With Do Not Disturb on, the banner may be hidden, but the sound still plays. If no notification service is running, the app opens its own popup instead.
- **No sound?** On Linux the sound is played with your system audio tools: `pw-play` (PipeWire), `paplay`, `aplay`, `ffplay` or `mpv`, whichever is installed. If you hear nothing, install one, for example `sudo pacman -S pipewire` (Arch) or `sudo apt install pulseaudio-utils` (Ubuntu / Debian).

## Coming next
- Official Chrome Web Store listing
- Android (maybe)
