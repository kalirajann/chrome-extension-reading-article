let originalStyles = null;
let readingModeEnabled = false;
let adObserver = null;

function getMainContent() {
  // Common selectors for article content, ordered by specificity
  const selectors = [
    // Most specific selectors first
    'article[class*="article"]',
    'article[class*="post"]',
    'div[class*="article-content"]',
    'div[class*="post-content"]',
    '[itemprop="articleBody"]',
    '.article-content',
    '.post-content',
    '.entry-content',
    '.article__content',
    '.article__body',
    '.post__content',
    '.post__body',
    '.story-content',
    '.story-body',
    '.article-body',
    // More generic selectors
    'article',
    '[role="main"]',
    'main',
    // Fallback selectors
    '#content',
    '.content',
    '.post',
    '.article'
  ];

  // Try to find content using selectors
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      // If multiple elements found, choose the one with the most text content
      const element = Array.from(elements).reduce((a, b) => {
        const aText = a.textContent.trim();
        const bText = b.textContent.trim();
        return aText.length > bText.length ? a : b;
      });
      
      // Less restrictive content validation
      const text = element.textContent.trim();
      if (text.length > 200) { // Reduced minimum length
        console.log('Found content using selector:', selector);
        return element;
      }
    }
  }

  // Fallback: look for the largest text container
  console.log('No standard content selectors found, using fallback method');
  
  // Get all elements that might contain article content
  const possibleContainers = Array.from(document.body.getElementsByTagName('*')).filter(el => {
    // Skip elements that are typically not article content
    if (el.tagName.toLowerCase() === 'script' ||
        el.tagName.toLowerCase() === 'style' ||
        el.tagName.toLowerCase() === 'noscript' ||
        el.tagName.toLowerCase() === 'iframe' ||
        el.classList.contains('nav') ||
        el.classList.contains('footer') ||
        el.classList.contains('comments')) {
      return false;
    }

    // Skip elements that are clearly ads
    if (isAdElement(el)) {
      return false;
    }

    const text = el.textContent.trim();
    // Less restrictive content requirements
    return text.length > 200 && text.split(' ').length > 30;
  });

  if (possibleContainers.length > 0) {
    // Sort by content length and choose the largest that's not too close to body size
    const sortedContainers = possibleContainers.sort((a, b) => 
      b.textContent.length - a.textContent.length
    );

    // Find a container with substantial content
    const bodyLength = document.body.textContent.length;
    const mainContent = sortedContainers.find(el => {
      const contentLength = el.textContent.length;
      // Accept containers that have reasonable content length
      return contentLength > 200 && contentLength < bodyLength * 0.95;
    }) || sortedContainers[0];

    console.log('Found main content container with length:', mainContent.textContent.length);
    return mainContent;
  }

  // If no suitable container found, use the body element
  console.log('No suitable content container found, using body element');
  return document.body;
}

function extractArticleContent() {
  try {
    const mainContent = getMainContent();
    console.log('Main content element found:', mainContent.tagName, mainContent.className);
    
    // Remove unwanted elements from the clone
    const contentClone = mainContent.cloneNode(true);
    const unwantedSelectors = [
      'script',
      'style',
      'iframe',
      'nav',
      'header',
      'footer',
      '.ad',
      '.advertisement',
      '.social-share',
      '.comments',
      '#comments',
      'aside',
      '.sidebar',
      '.related-posts',
      '.meta',
      '.share',
      '.author-info',
      '.navigation',
      '.breadcrumbs',
      '.pagination',
      '.menu',
      '.search',
      'form',
      '.widget',
      '.popup',
      '.modal',
      '.newsletter',
      '.subscription'
    ];

    let removedElements = 0;
    unwantedSelectors.forEach(selector => {
      const elements = contentClone.querySelectorAll(selector);
      elements.forEach(el => {
        el.remove();
        removedElements++;
      });
    });
    console.log('Removed elements count:', removedElements);

    // Extract text content and clean it up
    let text = contentClone.textContent
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();

    // Remove common unwanted text patterns
    text = text
      .replace(/^(By|Author)[:\s].*?\n/i, '') // Remove author byline
      .replace(/\b\d+\s+(min|minute)s?\s+read\b/gi, '') // Remove read time
      .replace(/Share\s*(on|via)\s*(Facebook|Twitter|LinkedIn|Email)/gi, '') // Remove share text
      .replace(/\b(Published|Updated|Posted)\s*(on|at)?\s*:?\s*\w+\s+\d+,?\s+\d{4}\b/gi, '') // Remove dates
      .trim();

    // Basic content validation
    if (text.length < 100) {
      console.error('Extracted content too short:', text.length);
      throw new Error('Extracted content is too short to be an article');
    }

    // Limit text length for API constraints
    const maxLength = 4000;
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '...';
      console.log('Content truncated to', maxLength, 'characters');
    }

    console.log('Final content length:', text.length);
    return text;
  } catch (error) {
    console.error('Error in extractArticleContent:', error);
    throw error;
  }
}

function createAdObserver(mainContent) {
  if (adObserver) {
    adObserver.disconnect();
  }

  adObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && !mainContent.contains(node)) { // Only process Element nodes outside main content
            removeAdsFromNode(node, mainContent);
          }
        });
      }
    });
  });

  adObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function isAdElement(element) {
  if (!element || element.nodeType !== 1) return false;

  const tagName = element.tagName.toLowerCase();
  const className = (element.className || '').toLowerCase();
  const id = (element.id || '').toLowerCase();

  // Skip checking certain elements that might be part of the main content
  if (['article', 'main', 'section', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
    return false;
  }

  // Check common ad patterns
  const adPatterns = [
    'ad', 'ads', 'adv', 'sponsor', 'promo', 'promotion', 'banner',
    'marketing', 'advertisement', 'advertising', 'commercial'
  ];

  // More careful pattern matching to avoid false positives
  const matchesAdPattern = adPatterns.some(pattern => {
    const classMatch = className.includes(pattern);
    const idMatch = id.includes(pattern);
    
    // Avoid matching words that might contain ad patterns
    if (classMatch || idMatch) {
      const word = className.split(' ').find(w => w.includes(pattern)) || 
                  id.split('-').find(w => w.includes(pattern));
      
      // Skip if the pattern is part of a different word (e.g., "loading", "shadow", etc.)
      if (word && !word.match(new RegExp(`\\b${pattern}\\b|\\b${pattern}s\\b|\\b${pattern}-|${pattern}\\b|-${pattern}\\b`))) {
        return false;
      }
      return true;
    }
    return false;
  });

  // Check for iframe sources
  const iframeCheck = tagName === 'iframe' && (
    element.src.toLowerCase().includes('ad') ||
    element.src.toLowerCase().includes('sponsor') ||
    element.src.toLowerCase().includes('doubleclick') ||
    element.src.toLowerCase().includes('adsystem')
  );

  return matchesAdPattern || iframeCheck;
}

function removeAdsFromNode(node, mainContent) {
  if (!node || !mainContent) return;

  // Don't remove if it's part of the main content
  if (mainContent.contains(node)) return;

  if (isAdElement(node)) {
    node.remove();
    return;
  }

  // Process child elements
  if (node.children && node.children.length > 0) {
    Array.from(node.children).forEach(child => {
      if (!mainContent.contains(child)) {
        if (isAdElement(child)) {
          child.remove();
        } else {
          removeAdsFromNode(child, mainContent);
        }
      }
    });
  }
}

function removeDistractions() {
  // Common ad and distraction selectors
  const distractions = [
    // Ad-specific selectors
    '[class*="ad-"]',
    '[class*="ads-"]',
    '[class*="-ad-"]',
    '[class*="-ads-"]',
    '[id*="ad-"]',
    '[id*="ads-"]',
    '[id*="-ad-"]',
    '[id*="-ads-"]',
    '.ad',
    '.ads',
    '.advertisement',
    '.advertising',
    '.advert',
    '.banner-ad',
    '.displayAd',
    '.google-ad',
    '.dfp-ad',
    'ins.adsbygoogle',
    '[data-ad]',
    '[data-ads]',
    '[data-ad-unit]',
    '[data-adunit]',
    '[data-advertisement]',
    
    // Common ad container names
    '.ad-container',
    '.ad-wrapper',
    '.ad-box',
    '.ad-unit',
    '.ad-slot',
    '.ad-banner',
    '.pub_300x250',
    '.pub_728x90',
    
    // Additional ad-related elements
    'div[id*="google_ads"]',
    'div[id*="doubleclick"]',
    'amp-ad',
    'amp-embed',
    '[id*="outbrain"]',
    '[id*="taboola"]'
  ];

  const mainContent = getMainContent();

  // Remove or hide distracting elements, but preserve main content
  distractions.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      // Don't remove elements that are part of or contain the main content
      if (!mainContent.contains(el) && !el.contains(mainContent)) {
        if (isAdElement(el)) {
          el.remove();
        } else {
          el.style.display = 'none';
        }
      }
    });
  });

  // Start observing for dynamically added ads
  createAdObserver(mainContent);
}

function applyReadingMode(preferences) {
  const mainContent = getMainContent();
  
  if (!originalStyles) {
    originalStyles = {
      html: document.documentElement.style.cssText,
      body: document.body.style.cssText,
      main: mainContent.style.cssText
    };
  }

  if (preferences.enabled) {
    // Create or get the reading mode container
    let container = document.getElementById('reading-mode-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'reading-mode-container';
      // Clone the content instead of moving it
      const contentClone = mainContent.cloneNode(true);
      container.appendChild(contentClone);
      document.body.appendChild(container);
    }

    // Remove distractions and start monitoring for new ads
    removeDistractions();

    // Apply styles to html and body
    document.documentElement.style.cssText = `
      background-color: ${preferences.backgroundColor} !important;
      color: ${preferences.textColor} !important;
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow-x: hidden !important;
    `;

    document.body.style.cssText = `
      background-color: ${preferences.backgroundColor} !important;
      color: ${preferences.textColor} !important;
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow-x: hidden !important;
      position: relative !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
    `;

    // Style the container
    container.style.cssText = `
      background-color: ${preferences.backgroundColor} !important;
      color: ${preferences.textColor} !important;
      width: 100% !important;
      max-width: 800px !important;
      margin: 0 auto !important;
      padding: 20px !important;
      position: relative !important;
      z-index: 1000 !important;
      box-sizing: border-box !important;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.1) !important;
    `;

    // Add global styles to prevent overlapping
    const styleId = 'reading-mode-styles';
    let styleSheet = document.getElementById(styleId);
    if (!styleSheet) {
      styleSheet = document.createElement('style');
      styleSheet.id = styleId;
      document.head.appendChild(styleSheet);
    }
    styleSheet.textContent = `
      body.reading-mode-enabled {
        overflow-x: hidden !important;
      }
      body.reading-mode-enabled > *:not(#reading-mode-container) {
        display: none !important;
      }
      #reading-mode-container {
        isolation: isolate !important;
      }
      #reading-mode-container * {
        max-width: 100% !important;
        box-sizing: border-box !important;
        font-size: ${preferences.fontSize}px !important;
        line-height: ${preferences.lineHeight} !important;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif !important;
        color: ${preferences.textColor} !important;
      }
      #reading-mode-container img {
        height: auto !important;
        margin: 1em 0 !important;
      }
      #reading-mode-container pre {
        overflow-x: auto !important;
        padding: 1em !important;
        background: rgba(0, 0, 0, 0.05) !important;
      }
      #reading-mode-container table {
        display: block !important;
        overflow-x: auto !important;
        max-width: 100% !important;
      }
      #reading-mode-container a {
        color: inherit !important;
        text-decoration: underline !important;
      }
    `;

    // Add reading mode class to body
    document.body.classList.add('reading-mode-enabled');
    readingModeEnabled = true;
  } else {
    // Stop observing for ads
    if (adObserver) {
      adObserver.disconnect();
      adObserver = null;
    }

    // Remove reading mode container
    const container = document.getElementById('reading-mode-container');
    if (container) {
      container.remove();
    }

    // Remove reading mode styles
    const styleSheet = document.getElementById('reading-mode-styles');
    if (styleSheet) {
      styleSheet.remove();
    }

    // Remove reading mode class from body
    document.body.classList.remove('reading-mode-enabled');

    // Restore original styles
    if (originalStyles) {
      document.documentElement.style.cssText = originalStyles.html;
      document.body.style.cssText = originalStyles.body;
      mainContent.style.cssText = originalStyles.main;
    }

    readingModeEnabled = false;
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateReadingMode') {
    applyReadingMode(request.preferences);
  } else if (request.action === 'getContent') {
    try {
      const content = extractArticleContent();
      console.log('Content extracted successfully');
      sendResponse({ content, success: true });
    } catch (error) {
      console.error('Failed to extract content:', error);
      sendResponse({ error: error.message, success: false });
    }
  }
  return true; // Required for async response
});

// Load initial preferences
chrome.storage.sync.get({
  enabled: false,
  fontSize: '16',
  lineHeight: '1.6',
  backgroundColor: 'white',
  textColor: 'black'
}, (preferences) => {
  applyReadingMode(preferences);
}); 