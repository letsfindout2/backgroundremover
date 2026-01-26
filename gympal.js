// Content script for Gympal integration
// Injects "Remove Background" button into Edit Product modal

(function() {
  'use strict';

  // Store original URL for undo functionality
  let originalImageUrl = null;

  // Toast notification function
  function showToast(message, type = 'info') {
    // Remove existing toast if any
    const existingToast = document.getElementById('gympal-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'gympal-toast';
    const colors = {
      success: { bg: '#4CAF50', icon: '✓' },
      error: { bg: '#F44336', icon: '❌' },
      info: { bg: '#2196F3', icon: 'ℹ️' },
      warning: { bg: '#FF9800', icon: '⚠️' }
    };
    const style = colors[type] || colors.info;

    toast.textContent = `${style.icon} ${message}`;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${style.bg};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease-out;
      max-width: 300px;
      word-wrap: break-word;
    `;

    // Add animation
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    if (!document.getElementById('gympal-toast-styles')) {
      styleSheet.id = 'gympal-toast-styles';
      document.head.appendChild(styleSheet);
    }

    document.body.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Validate image URL
  function isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (trimmed === '') return false;
    
    // Check if it's a valid URL or data URL
    try {
      if (trimmed.startsWith('data:image/')) return true;
      const urlObj = new URL(trimmed);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  // Function to create and inject the Remove Background button
  function injectRemoveBackgroundButton() {
    // Check if button already exists
    if (document.getElementById('gympal-remove-bg-container')) {
      return;
    }

    // Find the image input field and its container
    const imageInput = document.querySelector('input[id="image"][name="details.image"]');
    if (!imageInput) {
      return;
    }

    // Find the parent container with the label
    const labelContainer = imageInput.closest('.space-y-2');
    if (!labelContainer) {
      return;
    }

    // Find the parent container that has the image preview
    const parentContainer = labelContainer.closest('.space-y-4');
    if (!parentContainer) {
      return;
    }

    // Create container for buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'gympal-remove-bg-container';
    buttonContainer.style.cssText = `
      margin-top: 8px;
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    `;

    // Create the Remove Background button
    const removeBgButton = document.createElement('button');
    removeBgButton.id = 'gympal-remove-bg-btn';
    removeBgButton.type = 'button';
    removeBgButton.setAttribute('aria-label', 'Remove background from image');
    removeBgButton.textContent = '✨ Remove Background';
    removeBgButton.style.cssText = `
      padding: 8px 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    `;

    // Create Undo button (initially hidden)
    const undoButton = document.createElement('button');
    undoButton.id = 'gympal-undo-btn';
    undoButton.type = 'button';
    undoButton.setAttribute('aria-label', 'Undo background removal');
    undoButton.textContent = '↶ Undo';
    undoButton.style.cssText = `
      padding: 8px 16px;
      background: #6c757d;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
      display: none;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    `;

    // Add hover effects
    [removeBgButton, undoButton].forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        if (!btn.disabled) {
          btn.style.transform = 'translateY(-1px)';
          btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        }
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translateY(0)';
        btn.style.boxShadow = 'none';
      });
    });

    // Handle Remove Background click event
    removeBgButton.addEventListener('click', async () => {
      const currentImageUrl = imageInput.value?.trim();
      
      // Validate URL
      if (!isValidImageUrl(currentImageUrl)) {
        showToast('Please enter a valid image URL first', 'warning');
        imageInput.focus();
        return;
      }

      // Store original URL for undo
      originalImageUrl = currentImageUrl;

      // Disable button and show loading state
      removeBgButton.disabled = true;
      undoButton.disabled = true;
      const originalText = removeBgButton.textContent;
      removeBgButton.textContent = '⏳ Processing...';
      removeBgButton.style.opacity = '0.7';
      removeBgButton.style.cursor = 'not-allowed';
      
      showToast('Removing background... This may take a few seconds', 'info');

      try {
        // Send message to background script to process the image
        const response = await chrome.runtime.sendMessage({
          action: 'removeBackground',
          imageUrl: currentImageUrl
        });

        if (response && response.success) {
          // Update the input field with the new URL
          imageInput.value = response.imageUrl;
          
          // Trigger input event to notify any listeners
          imageInput.dispatchEvent(new Event('input', { bubbles: true }));
          imageInput.dispatchEvent(new Event('change', { bubbles: true }));

          // Update the preview image if it exists
          const previewImg = parentContainer.querySelector('img[alt="product"]');
          if (previewImg) {
            previewImg.src = response.imageUrl;
            // Add a subtle animation to show the change
            previewImg.style.transition = 'opacity 0.3s';
            previewImg.style.opacity = '0.7';
            setTimeout(() => {
              previewImg.style.opacity = '1';
            }, 100);
          }

          // Show success feedback
          removeBgButton.textContent = '✓ Background Removed!';
          removeBgButton.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
          showToast('Background removed successfully!', 'success');
          
          // Show undo button
          undoButton.style.display = 'inline-flex';
          
          setTimeout(() => {
            removeBgButton.textContent = originalText;
            removeBgButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
          }, 2000);
        } else {
          throw new Error(response?.error || 'Failed to remove background');
        }
      } catch (error) {
        console.error('Error removing background:', error);
        const errorMsg = error.message || 'An unexpected error occurred';
        showToast(errorMsg, 'error');
        removeBgButton.textContent = '❌ Error - Try Again';
        setTimeout(() => {
          removeBgButton.textContent = originalText;
        }, 2000);
      } finally {
        removeBgButton.disabled = false;
        undoButton.disabled = false;
        removeBgButton.style.opacity = '1';
        removeBgButton.style.cursor = 'pointer';
      }
    });

    // Handle Undo click event
    undoButton.addEventListener('click', () => {
      if (originalImageUrl) {
        imageInput.value = originalImageUrl;
        
        // Trigger input event to notify any listeners
        imageInput.dispatchEvent(new Event('input', { bubbles: true }));
        imageInput.dispatchEvent(new Event('change', { bubbles: true }));

        // Update the preview image if it exists
        const previewImg = parentContainer.querySelector('img[alt="product"]');
        if (previewImg) {
          previewImg.src = originalImageUrl;
        }

        // Hide undo button
        undoButton.style.display = 'none';
        originalImageUrl = null;
        
        showToast('Original image restored', 'info');
      }
    });

    // Add keyboard support
    removeBgButton.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        removeBgButton.click();
      }
    });

    undoButton.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        undoButton.click();
      }
    });

    // Append buttons to container
    buttonContainer.appendChild(removeBgButton);
    buttonContainer.appendChild(undoButton);

    // Insert container after the label container
    labelContainer.appendChild(buttonContainer);
  }

  // Debounce function for performance
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Debounced injection function
  const debouncedInject = debounce(injectRemoveBackgroundButton, 300);

  // Function to observe DOM changes and inject button when modal appears
  function observeModal() {
    // Try to inject immediately in case modal is already open
    setTimeout(injectRemoveBackgroundButton, 500);

    // Use MutationObserver to watch for modal appearance (debounced)
    const observer = new MutationObserver(() => {
      const imageInput = document.querySelector('input[id="image"][name="details.image"]');
      if (imageInput && !document.getElementById('gympal-remove-bg-container')) {
        debouncedInject();
      }
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeModal);
  } else {
    observeModal();
  }

  // Also try injecting on any dynamic content changes (for SPAs)
  let lastUrl = location.href;
  const urlObserver = new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      // Reset original URL when navigating
      originalImageUrl = null;
      setTimeout(injectRemoveBackgroundButton, 1000);
    }
  });
  urlObserver.observe(document, { subtree: true, childList: true });

  // Watch for input changes to reset undo button if user manually changes URL
  const inputObserver = new MutationObserver(() => {
    const imageInput = document.querySelector('input[id="image"][name="details.image"]');
    if (imageInput) {
      imageInput.addEventListener('input', () => {
        const undoBtn = document.getElementById('gympal-undo-btn');
        if (undoBtn && imageInput.value !== originalImageUrl) {
          undoBtn.style.display = 'none';
          originalImageUrl = null;
        }
      }, { once: false });
    }
  });
  inputObserver.observe(document.body, { childList: true, subtree: true });

})();
