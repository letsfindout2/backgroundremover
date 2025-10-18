// Create a free image hosting service API endpoint
const IMGBB_API_KEY = '9d6b9d3ccd2489f3fb59b4fb44d896a6'; // Get free API key from https://api.imgbb.com/

// Upload image to ImgBB and get direct link
async function uploadToImgBB(base64Data) {
  // Remove the data:image/png;base64, part if it exists
  const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
  
  try {
    // Using URLSearchParams instead of FormData for proper encoding
    const params = new URLSearchParams();
    params.append('key', IMGBB_API_KEY);
    params.append('image', base64Image);

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const result = await response.json();
    return result.data.url; // Returns direct image URL
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

// Create the context menu item
chrome.runtime.onInstalled.addListener(() => {
  // Remove existing menu items to avoid duplicates
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'getImageUrl',
      title: 'Get image URL',
      contexts: ['image']
    });
  });
});

// Handle the click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'getImageUrl') {
    try {
      // Get user's preference and API key
      const result = await chrome.storage.local.get(['action', 'removeBgKey']);
      const action = result.action || 'copy';
      
      // If the image data is in base64 format, convert it to a Blob URL
      if (info.srcUrl.startsWith('data:')) {
        const blobUrl = createBlobUrlFromBase64(info.srcUrl);
        if (blobUrl) {
          info.srcUrl = blobUrl;
        } else {
          throw new Error('Failed to convert image data to URL');
        }
      }
      
      if (action === 'remove-bg') {
        if (!result.removeBgKey) {
          throw new Error('Please set your Remove.bg API key in the extension settings');
        }

        // Show processing badge
        await chrome.action.setBadgeText({ text: '⏳' });
        await chrome.action.setBadgeBackgroundColor({ color: '#FFA000' });

        try {
          // First, verify the API key is valid
          const verifyResponse = await fetch('https://api.remove.bg/v1.0/account', {
            headers: {
              'X-Api-Key': result.removeBgKey
            }
          });

          if (!verifyResponse.ok) {
            throw new Error('Invalid API key. Please check your Remove.bg API key');
          }

          // Call remove.bg API
          const response = await fetch('https://api.remove.bg/v1.0/removebg', {
            method: 'POST',
            headers: {
              'X-Api-Key': result.removeBgKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image_url: info.srcUrl,
              size: 'auto',
              format: 'png',
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.errors?.[0]?.title || 'Failed to remove background');
          }

          // Get the binary data
          const imageData = await response.arrayBuffer();
          const blob = new Blob([imageData], { type: 'image/png' });

          // Convert to base64
          const base64data = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });

          // Upload to ImgBB to get permanent URL
          const permanentUrl = await uploadToImgBB(base64data);

          // Copy the URL directly to clipboard
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (imageUrl) => {
              navigator.clipboard.writeText(imageUrl);
              // Show a small toast notification
              const toast = document.createElement('div');
              toast.textContent = '✨ Image link copied to clipboard!';
              toast.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #4CAF50;
                color: white;
                padding: 10px 20px;
                border-radius: 4px;
                font-family: -apple-system, system-ui, sans-serif;
                font-size: 14px;
                z-index: 999999;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
              `;
              document.body.appendChild(toast);
              setTimeout(() => toast.remove(), 2000);
            },
            args: [permanentUrl]
          });

          // Show success badge
          await chrome.action.setBadgeText({ text: '✓' });
          await chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });

          // Show success badge
          await chrome.action.setBadgeText({ text: '✓' });
          await chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
        } catch (apiError) {
          console.error('API Error:', apiError);
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (errorMsg) => {
              alert('Remove.bg Error: ' + errorMsg);
            },
            args: [apiError.message]
          });
          throw apiError;
        }
      } else if (action === 'copy') {
        // Execute content script to copy to clipboard
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: async function(url) {
            try {
              await navigator.clipboard.writeText(url);
              return true;
            } catch (e) {
              // Fallback method
              const textarea = document.createElement('textarea');
              textarea.style.position = 'fixed';
              textarea.style.opacity = '0';
              textarea.value = url;
              document.body.appendChild(textarea);
              textarea.select();
              let success = false;
              try {
                success = document.execCommand('copy');
              } catch (e) {
                success = false;
              }
              document.body.removeChild(textarea);
              return success;
            }
          },
          args: [info.srcUrl]
        });

        // Show success badge
        await chrome.action.setBadgeText({ text: '✓' });
        await chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
      } else {
        // Open in new tab
        await chrome.tabs.create({ url: info.srcUrl });
      }
      
      // Clear badge after delay
      setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
      }, 2000);
    } catch (error) {
      console.error('Error:', error);
      await chrome.action.setBadgeText({ text: '!' });
      await chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
      }, 2000);
    }
  }
});