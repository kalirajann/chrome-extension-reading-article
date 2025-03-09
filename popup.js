document.addEventListener('DOMContentLoaded', () => {
  const readingModeToggle = document.getElementById('reading-mode-toggle');
  const fontSize = document.getElementById('font-size');
  const fontSizeValue = document.getElementById('font-size-value');
  const lineHeight = document.getElementById('line-height');
  const lineHeightValue = document.getElementById('line-height-value');
  const backgroundColor = document.getElementById('background-color');
  const textColor = document.getElementById('text-color');
  const summarizeBtn = document.getElementById('summarize-btn');
  const apiKeyInput = document.getElementById('api-key');
  const summaryContainer = document.getElementById('summary-container');
  const loadingIndicator = document.getElementById('loading-indicator');

  // Load saved preferences
  chrome.storage.sync.get({
    enabled: false,
    fontSize: '16',
    lineHeight: '1.6',
    backgroundColor: 'white',
    textColor: 'black',
    apiKey: ''
  }, (items) => {
    readingModeToggle.checked = items.enabled;
    fontSize.value = items.fontSize;
    fontSizeValue.textContent = `${items.fontSize}px`;
    lineHeight.value = items.lineHeight;
    lineHeightValue.textContent = items.lineHeight;
    backgroundColor.value = items.backgroundColor;
    textColor.value = items.textColor;
    apiKeyInput.value = items.apiKey;
  });

  // Save preferences and update content
  function savePreferences() {
    const preferences = {
      enabled: readingModeToggle.checked,
      fontSize: fontSize.value,
      lineHeight: lineHeight.value,
      backgroundColor: backgroundColor.value,
      textColor: textColor.value,
      apiKey: apiKeyInput.value
    };

    chrome.storage.sync.set(preferences);

    // Send message to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'updateReadingMode',
        preferences: preferences
      });
    });
  }

  function showError(message) {
    summaryContainer.style.display = 'block';
    summaryContainer.style.color = '#dc3545';
    summaryContainer.textContent = `Error: ${message}`;
  }

  async function ensureContentScriptInjected(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
    } catch (error) {
      console.log('Content script already injected or failed to inject:', error);
    }
  }

  async function summarizeArticle() {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      showError('Please enter your OpenAI API key');
      return;
    }

    summarizeBtn.disabled = true;
    loadingIndicator.style.display = 'block';
    summaryContainer.style.display = 'none';

    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        throw new Error('No active tab found');
      }

      // Ensure content script is injected
      await ensureContentScriptInjected(tab.id);

      // Try to get content multiple times with a delay
      let response;
      for (let i = 0; i < 3; i++) {
        try {
          response = await new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tab.id, { action: 'getContent' }, (result) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(result);
              }
            });
          });
          if (response && response.content) break;
        } catch (error) {
          console.log(`Attempt ${i + 1} failed:`, error);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      console.log('Content extraction response:', response);

      if (!response || !response.success) {
        throw new Error(response?.error || 'Could not extract article content. Please make sure you are on an article page.');
      }

      if (!response.content || response.content.trim().length === 0) {
        throw new Error('No article content found to summarize. Please make sure you are on an article page.');
      }

      // Call OpenAI API
      const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that summarizes articles concisely. Focus on the main points and key takeaways."
            },
            {
              role: "user",
              content: `Please provide a concise summary of the following article in 2-3 paragraphs: ${response.content}`
            }
          ],
          max_tokens: 250,
          temperature: 0.7
        })
      });

      if (!openAIResponse.ok) {
        const errorData = await openAIResponse.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `OpenAI API request failed: ${openAIResponse.status}`);
      }

      const data = await openAIResponse.json();
      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid response from OpenAI API');
      }

      const summary = data.choices[0].message.content;
      summaryContainer.style.color = 'inherit';
      summaryContainer.textContent = summary;
      summaryContainer.style.display = 'block';
    } catch (error) {
      console.error('Summarization error:', error);
      showError(error.message);
    } finally {
      summarizeBtn.disabled = false;
      loadingIndicator.style.display = 'none';
    }
  }

  // Event listeners
  readingModeToggle.addEventListener('change', savePreferences);
  fontSize.addEventListener('input', (e) => {
    fontSizeValue.textContent = `${e.target.value}px`;
    savePreferences();
  });
  lineHeight.addEventListener('input', (e) => {
    lineHeightValue.textContent = e.target.value;
    savePreferences();
  });
  backgroundColor.addEventListener('change', savePreferences);
  textColor.addEventListener('change', savePreferences);
  apiKeyInput.addEventListener('change', savePreferences);
  summarizeBtn.addEventListener('click', summarizeArticle);
}); 