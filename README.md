# Image Link Grabber with Background Removal

A Chrome extension that helps you quickly grab image URLs and optionally remove backgrounds from images using the Remove.bg API.

## Features

- Right-click on any image to copy its direct URL
- Option to remove image backgrounds using Remove.bg
- Automatic upload of processed images to ImgBB for permanent hosting
- Quick copy to clipboard with notification
- Support for both regular images and base64 encoded images

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

1. Right-click on any image on a webpage
2. Select "Get image URL"
3. If background removal is enabled:
   - The image will be processed through Remove.bg
   - Uploaded to ImgBB
   - The permanent URL will be automatically copied to your clipboard
4. A brief notification will confirm when the URL is copied

## Files

- `manifest.json`: Extension configuration and permissions
- `background.js`: Core processing logic, API integrations
- `popup.html`: Extension popup interface
- `popup.js`: Popup interaction logic

## API Integration

This extension uses two external APIs:
- [Remove.bg](https://www.remove.bg/api) for background removal
- [ImgBB](https://api.imgbb.com/) for image hosting

Make sure to check their respective terms of service and pricing.