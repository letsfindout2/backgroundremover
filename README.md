# Image Link Grabber with Background Removal

A Chrome extension that helps you quickly grab image URLs and optionally remove backgrounds from images using the Remove.bg API.

## Features

- Right-click on any image to copy its direct URL
- Option to remove image backgrounds using Remove.bg
- Automatic upload of processed images to ImgBB for permanent hosting
- Quick copy to clipboard with notification
- Support for both regular images and base64 encoded images
- **Gympal Integration**: Automatic "Remove Background" button injection on web.gympal.com Edit Product modals
  - One-click background removal directly in the Gympal interface
  - Undo functionality to restore original images
  - Toast notifications for better user feedback
  - URL validation and error handling

## Setup

1. Get your API keys:
   - Get a free API key from [Remove.bg](https://www.remove.bg/api)
   - Get a free API key from [ImgBB](https://api.imgbb.com/)

2. Install the extension:
   - Clone this repository
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the extension directory

3. Configure the extension:
   - Update `IMGBB_API_KEY` in `background.js` with your ImgBB API key
   - Right-click the extension icon and go to options to set your Remove.bg API key

## Usage

### General Usage
1. Right-click on any image on a webpage
2. Select "Get image URL"
3. If background removal is enabled:
   - The image will be processed through Remove.bg
   - Uploaded to ImgBB
   - The permanent URL will be automatically copied to your clipboard
4. A brief notification will confirm when the URL is copied

### Gympal Integration
When using [web.gympal.com](https://web.gympal.com):
1. Navigate to the Edit Product modal
2. Enter an image URL in the Image URL field
3. Click the "✨ Remove Background" button that appears automatically
4. The background will be removed and the URL will be updated automatically
5. Use the "↶ Undo" button to restore the original image if needed

## Files

- `manifest.json`: Extension configuration and permissions
- `background.js`: Core processing logic, API integrations, message handlers
- `popup.html`: Extension popup interface
- `popup.js`: Popup interaction logic
- `gympal.js`: Content script for Gympal website integration

## API Integration

This extension uses two external APIs:
- [Remove.bg](https://www.remove.bg/api) for background removal
- [ImgBB](https://api.imgbb.com/) for image hosting

Make sure to check their respective terms of service and pricing.