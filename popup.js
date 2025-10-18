document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Load saved preferences
    const result = await chrome.storage.local.get(['action', 'removeBgKey']);
    const action = result.action || 'copy';
    const apiKey = result.removeBgKey || '';
    
    // Set saved values
    document.getElementById(action).classList.add('selected');
    document.getElementById('remove-bg-key').value = apiKey;

    // Show API key status
    const saveButton = document.getElementById('save-key');
    if (apiKey) {
      saveButton.style.backgroundColor = '#4CAF50';
      saveButton.textContent = 'API Key Saved ✓';
    }

    // Handle option clicks
    document.querySelectorAll('.option').forEach(option => {
      option.addEventListener('click', async () => {
        try {
          // Check if remove-bg is selected but no API key is set
          if (option.id === 'remove-bg') {
            const currentKey = await chrome.storage.local.get(['removeBgKey']);
            if (!currentKey.removeBgKey) {
              alert('Please set your Remove.bg API key first');
              document.getElementById('remove-bg-key').focus();
              return;
            }
          }

          // Visual feedback first
          document.querySelectorAll('.option').forEach(opt => {
            opt.classList.remove('selected');
          });
          option.classList.add('selected');
          
          // Save preference
          await chrome.storage.local.set({ action: option.id });
          
          // Show feedback
          const feedback = document.createElement('div');
          feedback.textContent = `Mode set to: ${option.textContent.trim()}`;
          feedback.style.cssText = 'position:fixed; bottom:10px; left:50%; transform:translateX(-50%); background:#4CAF50; color:white; padding:8px 16px; border-radius:4px; font-size:12px;';
          document.body.appendChild(feedback);
          
          // Close popup after delay
          setTimeout(() => window.close(), 1500);
        } catch (error) {
          console.error('Error saving preference:', error);
          alert('Error: ' + error.message);
        }
      });
    });

    // Handle API key save
    document.getElementById('save-key').addEventListener('click', async () => {
      const keyInput = document.getElementById('remove-bg-key');
      const key = keyInput.value.trim();
      const saveButton = document.getElementById('save-key');
      
      if (!key) {
        alert('Please enter an API key');
        keyInput.focus();
        return;
      }

      saveButton.textContent = 'Saving...';
      saveButton.disabled = true;

      try {
        // Save the key
        await chrome.storage.local.set({ removeBgKey: key });
        
        // Update button
        saveButton.style.backgroundColor = '#4CAF50';
        saveButton.textContent = 'API Key Saved ✓';
        
        // Test the API key
        const testResponse = await fetch('https://api.remove.bg/v1.0/account', {
          headers: {
            'X-Api-Key': key
          }
        });

        if (!testResponse.ok) {
          throw new Error('Invalid API key');
        }

        // Show success message
        alert('API key verified and saved successfully!');
      } catch (error) {
        console.error('Error saving/testing API key:', error);
        alert('Error: ' + (error.message || 'Failed to verify API key'));
        saveButton.style.backgroundColor = '#F44336';
        saveButton.textContent = 'Error - Try Again';
      } finally {
        saveButton.disabled = false;
      }
    });

  } catch (error) {
    console.error('Error loading preference:', error);
    alert('Error: ' + error.message);
  }
});