#!/bin/bash

# # Dependencies
# npm install -g ttab

open_ide () {
  webstorm .
}

open_browser_windows () {
  # open new browser window and focus
  # repo
  open /Applications/Google\ Chrome.app --new --args --new-window http://localhost:8000
  # needed to get the focus timing right if there is another chrome window in the same "space"
  sleep 1
}

main () {
  ttab eval "pyserver"
  open_browser_windows
  open_ide
}

main
