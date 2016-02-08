# rally-chrome-extension

## Getting the plugin (with git)

 1. Clone the repo https://github.com/agradl/rally-chrome-extension.git

## Getting the plugin (without git)

 1. Go to the repo
 2. Click the Download Zip button
 3. unzip to a directory

## Installing the plugin
1. Open chrome and click the menu icon in the upper right corner
2. Choose Settings and then click the extensions tab on the left
3. Check the "Developer Mode" checkbox
4. Click the "Load unpacked extensions..." button and select the directory you cloned the repo to
5. Check the "Enabled" checkbox next to the "Rally Extension" plugin
6. Scroll to the bottom and click "Keyboard Shortcuts" to assign a key (I usually do `CMD + SHIFT + P`)

## Shortcuts

 - `CMD + SHIFT + P` (configurable in chrome extension settings) - cycles through visible Formatted IDs on the page
 - `SHIFT + P` - copy the formatted string "FormattedID : Name" to your clipboard
 - `SHIFT + O` - copy the formatted string "FormattedID : Name - DetailPageLink" to your clipboard
 - `SHIFT + D` - open the detail page for the selected FormattedID