# opencut-classic.exe

A local Windows package of OpenCut Classic. We did not develop OpenCut. This repository only packages the public editor so it can run on your computer.

- Original, archived editor: [opencut-app/opencut-classic](https://github.com/opencut-app/opencut-classic)
- Current OpenCut rewrite: [opencut-app/opencut](https://github.com/opencut-app/opencut)

## Run it

Download [the latest release](https://github.com/figuesosa/opencut-classic.exe/releases).

- `opencut-classic.msi` installs the app and adds a Start menu shortcut.
- `opencut-classic.zip` is the same app without an installer. Unzip it and run `opencut-classic.exe`.

`opencut-classic.exe` is the application window. It includes its own Chromium runtime, so Chrome, Edge, or another browser does not have to be installed. Projects stay on this computer.

## What was left out

The Sounds tab in the original editor searches the Freesound website. That needs a Freesound API key and an internet connection. This package removes that tab. Add your own audio from the Media tab.

The feedback button sends a message to the OpenCut server. This package removes that button.

There is no account to sign in to. Editing, including your own video and audio files, runs on this computer.
