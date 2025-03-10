# Reading Mode for Articles - Chrome Extension

A powerful Chrome extension that transforms article pages into a clean, distraction-free reading experience with customizable options and AI-powered summarization.

## Features

### 🎯 Core Features
- **Clean Reading Mode**: Instantly transforms any article into a clean, readable format
- **Ad Removal**: Intelligently removes ads and distracting elements while preserving important content
- **Smart Content Detection**: Automatically identifies and extracts the main article content
- **Responsive Layout**: Ensures content looks great on any screen size

### ⚙️ Customization Options
- **Font Size Control**: Adjust text size for comfortable reading
- **Line Height**: Customize line spacing for better readability
- **Color Themes**: Choose between different background and text colors
- **Layout Settings**: Centered content with optimal width for reading

### 🤖 AI Features
- **Article Summarization**: Get quick summaries of articles using OpenAI's technology
- **Smart Content Extraction**: Advanced algorithms to identify and preserve important content

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The extension icon should appear in your Chrome toolbar

## Usage

1. **Enable Reading Mode**:
   - Click the extension icon on any article page
   - Toggle the "Enable Reading Mode" switch

2. **Customize Appearance**:
   - Adjust font size using the slider
   - Change line height for comfortable reading
   - Select background and text colors
   - All changes are applied instantly

3. **Article Summarization**:
   - Click the "Summarize Article" button
   - Wait for the AI to process the content
   - View the generated summary

## Technical Details

### Key Components
- `manifest.json`: Extension configuration and permissions
- `popup.html/js`: User interface and controls
- `content.js`: Core functionality for content transformation
- `background.js`: Background processes and API handling
- `styles.css`: Custom styling for reading mode

### Content Processing
- Smart content detection using prioritized selectors
- Intelligent ad removal with mutation observers
- Responsive layout management
- Clean content extraction for summarization

## Requirements

- Chrome Browser (Latest version recommended)
- For summarization feature: OpenAI API key (to be configured)

## Sample Output
### Screen Before Using the extension
https://thestoryoftelling.com/books/the-right-story/
![image](https://github.com/user-attachments/assets/19dc2453-0054-464f-80d6-e997881b6c05)
https://www.espncricinfo.com/series/icc-champions-trophy-2024-25-1459031/india-vs-new-zealand-final-1466428/match-report
![image](https://github.com/user-attachments/assets/85beeab4-189b-4a09-8b28-b2d28fa99978)

### Screen Using extension
https://thestoryoftelling.com/books/the-right-story/
![image](https://github.com/user-attachments/assets/a30b75e5-763c-4f6a-8e9c-5991d3da40af)
https://www.espncricinfo.com/series/icc-champions-trophy-2024-25-1459031/india-vs-new-zealand-final-1466428/match-report
![image](https://github.com/user-attachments/assets/c74ed1b2-f89c-4eee-9efc-2577cf7e1c7d)




## Privacy & Security

- No user data is collected or stored
- Content processing happens locally in the browser
- API calls for summarization are made securely
- No tracking or analytics included

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have suggestions for improvements, please open an issue on GitHub. 
