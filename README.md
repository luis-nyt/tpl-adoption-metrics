# NYT TPL Design System Highlighter

A Chrome extension for the New York Times design systems team to highlight elements using the TPL design system on nytimes.com pages.

## Features

- **Auto-detection**: Automatically finds elements with TPL classes (prefixed with `tpl`)
- **Visual highlighting**: Highlights TPL elements with colored outlines and badges
- **Element details**: Click on highlighted elements to see TPL class information
- **Statistics**: Shows count of TPL elements found on the current page
- **Toggle control**: Easy on/off switching via popup interface
- **Color coding**: Different colors for different element types (headers, buttons, text, etc.)

## Installation

1. **Download the extension files** to your local machine
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer mode** (toggle in top right corner)
4. **Click "Load unpacked"** and select the `nyt-tpl-highlighter` folder
5. **Navigate to nytimes.com** to test the extension

## Usage

1. **Visit any nytimes.com page**
2. **Click the TPL extension icon** in the Chrome toolbar
3. **Click "Activate"** to highlight TPL elements on the page
4. **View statistics** in the popup (element count, current page)
5. **Click on highlighted elements** to see detailed information
6. **Use "Refresh"** to reload the page and re-scan for elements

## How It Works

The extension scans the page for:
- Elements with class names starting with `tpl`
- Elements with class names containing `tpl-`
- CSS custom properties and values containing `tpl`

### Visual Indicators

- **Orange outline/badge**: Default TPL elements
- **Purple outline/badge**: Header and navigation elements
- **Green outline/badge**: Button elements  
- **Yellow outline/badge**: Text and typography elements

## Development

### File Structure
```
nyt-tpl-highlighter/
├── manifest.json          # Extension configuration
├── content.js            # Main highlighting logic
├── popup.html           # Extension popup interface
├── popup.js             # Popup functionality
├── highlight.css        # Highlighting styles
├── icons/               # Extension icons
└── README.md           # This file
```

### Key Components

- **TPLHighlighter class**: Core functionality for detecting and highlighting elements
- **Message passing**: Communication between popup and content script
- **Dynamic styling**: CSS classes applied/removed based on activation state
- **Element inspection**: Detailed information extraction for TPL elements

## Permissions

- `activeTab`: Access to current tab content
- `*://*.nytimes.com/*`: Permission to run on NYT domains

## Browser Support

- Chrome (Manifest V3)
- Chromium-based browsers

## Version History

- **v1.0.0**: Initial release with basic highlighting and statistics

## Support

For issues or feature requests, contact the NYT Design Systems team.
