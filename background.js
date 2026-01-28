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

// Convert base64 data URL to Blob URL
function createBlobUrlFromBase64(dataUrl) {
  try {
    const response = fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => URL.createObjectURL(blob));
    return response;
  } catch (error) {
    console.error('Error creating blob URL:', error);
    return null;
  }
}

// Resize image to 256x256 using OffscreenCanvas (works in service workers)
async function resizeImageTo256x256(blob) {
  try {
    // Create ImageBitmap from blob
    const imageBitmap = await createImageBitmap(blob);
    
    // Step 1: Find bounding box of non-transparent pixels (crop transparent padding)
    const tempCanvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(imageBitmap, 0, 0);
    
    const imageData = tempCtx.getImageData(0, 0, imageBitmap.width, imageBitmap.height);
    const data = imageData.data;
    
    let minX = imageBitmap.width;
    let minY = imageBitmap.height;
    let maxX = 0;
    let maxY = 0;
    
    // Find bounds of non-transparent pixels
    for (let y = 0; y < imageBitmap.height; y++) {
      for (let x = 0; x < imageBitmap.width; x++) {
        const alpha = data[(y * imageBitmap.width + x) * 4 + 3];
        if (alpha > 0) { // Non-transparent pixel
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    
    // If no non-transparent pixels found, use full image
    if (minX >= maxX || minY >= maxY) {
      minX = 0;
      minY = 0;
      maxX = imageBitmap.width;
      maxY = imageBitmap.height;
    }
    
    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;
    
    // Step 2: Create cropped image
    const croppedCanvas = new OffscreenCanvas(cropWidth, cropHeight);
    const croppedCtx = croppedCanvas.getContext('2d');
    croppedCtx.drawImage(imageBitmap, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    
    // Step 3: Resize cropped product to fill 256x256
    const finalCanvas = new OffscreenCanvas(256, 256);
    const finalCtx = finalCanvas.getContext('2d');
    
    // Calculate scale to fill 256x256 (may crop edges but product fills canvas)
    const scale = Math.max(256 / cropWidth, 256 / cropHeight);
    const scaledWidth = cropWidth * scale;
    const scaledHeight = cropHeight * scale;
    const x = (256 - scaledWidth) / 2;
    const y = (256 - scaledHeight) / 2;
    
    // Draw cropped product scaled to fill canvas
    finalCtx.drawImage(croppedCanvas, x, y, scaledWidth, scaledHeight);
    
    // Convert canvas to blob
    const resizedBlob = await finalCanvas.convertToBlob({ type: 'image/png' });
    
    // Clean up
    imageBitmap.close();
    
    return resizedBlob;
  } catch (error) {
    console.error('Error resizing image:', error);
    throw new Error('Failed to resize image: ' + error.message);
  }
}

async function blobToDataUrl(blob) {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image data'));
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

// Reusable function to remove background from an image URL
async function removeBackgroundFromImage(imageUrl, removeBgKey, options = {}) {
  const mode = options.mode || 'fill256';
  // If the image data is in base64 format, convert it to a Blob URL
  let processedImageUrl = imageUrl;
  if (imageUrl.startsWith('data:')) {
    const blobUrl = await createBlobUrlFromBase64(imageUrl);
    if (blobUrl) {
      processedImageUrl = blobUrl;
    } else {
      throw new Error('Failed to convert image data to URL');
    }
  }

  // Verify the API key is valid
  const verifyResponse = await fetch('https://api.remove.bg/v1.0/account', {
    headers: {
      'X-Api-Key': removeBgKey
    }
  });

  if (!verifyResponse.ok) {
    throw new Error('Invalid API key. Please check your Remove.bg API key');
  }

  // Call remove.bg API
  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: {
      'X-Api-Key': removeBgKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: processedImageUrl,
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

  const outputBlob = mode === 'fill256' ? await resizeImageTo256x256(blob) : blob;

  // Convert to base64
  const base64data = await blobToDataUrl(outputBlob);

  // Upload to ImgBB to get permanent URL
  const permanentUrl = await uploadToImgBB(base64data);

  return permanentUrl;
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
        const blobUrl = await createBlobUrlFromBase64(info.srcUrl);
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
          // Use the reusable function
          const permanentUrl = await removeBackgroundFromImage(info.srcUrl, result.removeBgKey);

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

// Handle messages from content scripts (e.g., Gympal integration)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'removeBackground') {
    // Handle background removal request from content script
    (async () => {
      try {
        // Get API key from storage
        const result = await chrome.storage.local.get(['removeBgKey']);
        
        if (!result.removeBgKey) {
          sendResponse({ 
            success: false, 
            error: 'Please set your Remove.bg API key in the extension settings' 
          });
          return;
        }

        // Show processing badge
        await chrome.action.setBadgeText({ text: '⏳' });
        await chrome.action.setBadgeBackgroundColor({ color: '#FFA000' });

        try {
          // Use the reusable function to remove background
          const permanentUrl = await removeBackgroundFromImage(request.imageUrl, result.removeBgKey, {
            mode: request.mode || 'fill256'
          });

          // Show success badge
          await chrome.action.setBadgeText({ text: '✓' });
          await chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
          setTimeout(() => {
            chrome.action.setBadgeText({ text: '' });
          }, 2000);

          sendResponse({ 
            success: true, 
            imageUrl: permanentUrl 
          });
        } catch (apiError) {
          console.error('API Error:', apiError);
          await chrome.action.setBadgeText({ text: '!' });
          await chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
          setTimeout(() => {
            chrome.action.setBadgeText({ text: '' });
          }, 2000);
          
          sendResponse({ 
            success: false, 
            error: apiError.message 
          });
        }
      } catch (error) {
        console.error('Error:', error);
        await chrome.action.setBadgeText({ text: '!' });
        await chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
        setTimeout(() => {
          chrome.action.setBadgeText({ text: '' });
        }, 2000);
        
        sendResponse({ 
          success: false, 
          error: error.message 
        });
      }
    })();
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }
});