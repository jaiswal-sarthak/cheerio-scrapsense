// Background Service Worker
console.log('ScrapeSense background service worker ready');

// Set default settings on install
chrome.runtime.onInstalled.addListener(() => {
    console.log('ScrapeSense extension installed');

    chrome.storage.local.set({
        settings: {
            autoSave: true,
            maxPages: 5
        }
    }).catch((error) => {
        console.error('Failed to set default settings:', error);
    });
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SAVE_DATA') {
        chrome.storage.local.get(['scrapedData']).then((result) => {
            const existingData = result.scrapedData || [];
            existingData.push({
                ...message.data,
                timestamp: Date.now()
            });

            chrome.storage.local.set({ scrapedData: existingData }).then(() => {
                sendResponse({ success: true });
            });
        });
        return true;
    }

    if (message.type === 'GET_SAVED_DATA') {
        chrome.storage.local.get(['scrapedData']).then((result) => {
            sendResponse({ data: result.scrapedData || [] });
        });
        return true;
    }
});
