function getStoredLanguage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['wrc-language'], (result) => {
      resolve(result['wrc-language'] || 'en');
    });
  });
}

let cachedTranslations = null;
let cachedLang = null;

async function getTranslations() {
  const lang = await getStoredLanguage();
  if (cachedLang === lang && cachedTranslations) {
    return cachedTranslations;
  }
  cachedLang = lang;
  cachedTranslations = {
    en: {
      bg_log_loaded: 'WRC Analyst Extension background script loaded',
      bg_log_sidebar_toggle_error: 'Error toggling sidebar:',
      bg_log_sidebar_toggle_response: 'Sidebar toggle response:',
      bg_log_message_received: 'Message received:',
      bg_log_data_saved: 'Data saved to storage',
      bg_log_unknown_action: 'Unknown action',
      bg_log_extension_installed: 'WRC Analyst Extension installed:',
      bg_log_first_install: 'WRC Analyst Extension first installed',
      bg_log_updated: 'WRC Analyst Extension updated',
      bg_log_wrc_page_loaded: 'WRC page loaded:',
      bg_log_message_send_error: 'Error sending message:',
      bg_notification_title: 'WRC Analyst',
      bg_notification_wrong_page: 'This feature is only available on WRC club pages!',
    },
    hu: {
      bg_log_loaded: 'WRC Adatkinyerő Extension background script betöltődött',
      bg_log_sidebar_toggle_error: 'Hiba a sidebar kapcsolásakor:',
      bg_log_sidebar_toggle_response: 'Sidebar kapcsolás válasz:',
      bg_log_message_received: 'Üzenet érkezett:',
      bg_log_data_saved: 'Adatok elmentve a storage-ba',
      bg_log_unknown_action: 'Ismeretlen akció',
      bg_log_extension_installed: 'WRC Adatkinyerő Extension telepítve:',
      bg_log_first_install: 'WRC Adatkinyerő Extension először telepítve',
      bg_log_updated: 'WRC Adatkinyerő Extension frissítve',
      bg_log_wrc_page_loaded: 'WRC oldal betöltődve:',
      bg_log_message_send_error: 'Hiba az üzenetküldéskor:',
      bg_notification_title: 'WRC Adatkinyerő',
      bg_notification_wrong_page: 'Ez a funkció csak WRC klub oldalakon érhető el!',
    }
  };
  return cachedTranslations;
}

function bgT(key) {
  const translations = cachedTranslations || {
    en: {
      bg_log_loaded: 'WRC Analyst Extension background script loaded',
      bg_log_sidebar_toggle_error: 'Error toggling sidebar:',
      bg_log_sidebar_toggle_response: 'Sidebar toggle response:',
      bg_log_message_received: 'Message received:',
      bg_log_data_saved: 'Data saved to storage',
      bg_log_unknown_action: 'Unknown action',
      bg_log_extension_installed: 'WRC Analyst Extension installed:',
      bg_log_first_install: 'WRC Analyst Extension first installed',
      bg_log_updated: 'WRC Analyst Extension updated',
      bg_log_wrc_page_loaded: 'WRC page loaded:',
      bg_log_message_send_error: 'Error sending message:',
      bg_notification_title: 'WRC Analyst',
      bg_notification_wrong_page: 'This feature is only available on WRC club pages!',
    },
    hu: {
      bg_log_loaded: 'WRC Adatkinyerő Extension background script betöltődött',
      bg_log_sidebar_toggle_error: 'Hiba a sidebar kapcsolásakor:',
      bg_log_sidebar_toggle_response: 'Sidebar kapcsolás válasz:',
      bg_log_message_received: 'Üzenet érkezett:',
      bg_log_data_saved: 'Adatok elmentve a storage-ba',
      bg_log_unknown_action: 'Ismeretlen akció',
      bg_log_extension_installed: 'WRC Adatkinyerő Extension telepítve:',
      bg_log_first_install: 'WRC Adatkinyerő Extension először telepítve',
      bg_log_updated: 'WRC Adatkinyerő Extension frissítve',
      bg_log_wrc_page_loaded: 'WRC oldal betöltődve:',
      bg_log_message_send_error: 'Hiba az üzenetküldéskor:',
      bg_notification_title: 'WRC Adatkinyerő',
      bg_notification_wrong_page: 'Ez a funkció csak WRC klub oldalakon érhető el!',
    }
  };
  const lang = cachedLang || 'en';
  return translations[lang]?.[key] || translations['en'][key] || key;
}

getTranslations();

console.log('WRC Analyst Extension background script loaded');

if (chrome.action && chrome.action.onClicked) {
  chrome.action.onClicked.addListener((tab) => {
    if (tab.url && tab.url.includes('racenet.com/ea_sports_wrc/clubs/')) {
      chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(bgT('bg_log_sidebar_toggle_error'), chrome.runtime.lastError);
        } else {
          console.log(bgT('bg_log_sidebar_toggle_response'), response);
        }
      });
    } else {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: bgT('bg_notification_title'),
        message: bgT('bg_notification_wrong_page')
      });
    }
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(bgT('bg_log_message_received'), request);
  
  switch (request.action) {
    case 'logToBackground':
      console.log('[WRC Background]', request.message);
      sendResponse({ success: true });
      break;
      
    case 'saveData':
      chrome.storage.local.set({ wrcTestData: request.data }, () => {
        console.log(bgT('bg_log_data_saved'));
        sendResponse({ success: true });
      });
      break;
      
    case 'loadData':
      chrome.storage.local.get(['wrcTestData'], (result) => {
        sendResponse({ data: result.wrcTestData || null });
      });
      return true;
      
    case 'collectAllStages':
      chrome.tabs.sendMessage(sender.tab.id, { action: 'collectAllStages' }, (response) => {
        sendResponse(response);
      });
      return true;
      
    case 'testSingleStage':
      chrome.tabs.sendMessage(sender.tab.id, { 
        action: 'testSingleStage',
        stageName: request.stageName 
      }, (response) => {
        sendResponse(response);
      });
      return true;
      
    case 'checkStageDetection':
      chrome.tabs.sendMessage(sender.tab.id, { action: 'checkStageDetection' }, (response) => {
        sendResponse(response);
      });
      return true;
      
    case 'getLanguage':
      getStoredLanguage().then(lang => {
        sendResponse({ language: lang });
      });
      return true;
      
    case 'setLanguage':
      if (request.language === 'hu' || request.language === 'en') {
        cachedLang = request.language;
        chrome.storage.local.set({ 'wrc-language': request.language }, () => {
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: false });
      }
      return true;
      
    default:
      sendResponse({ error: bgT('bg_log_unknown_action') });
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  console.log(bgT('bg_log_extension_installed'), details.reason);
  
  if (details.reason === 'install') {
    chrome.storage.local.set({ 'wrc-language': 'en' }, () => {
      console.log(bgT('bg_log_first_install'));
    });
  } else if (details.reason === 'update') {
    console.log(bgT('bg_log_updated'));
    chrome.storage.local.get(['wrc-language'], (result) => {
      if (!result['wrc-language']) {
        chrome.storage.local.set({ 'wrc-language': 'en' });
      }
    });
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('racenet.com/ea_sports_wrc/clubs/')) {
    console.log(bgT('bg_log_wrc_page_loaded'), tab.url);
    chrome.tabs.sendMessage(tabId, { action: 'pageLoaded' }, () => {
      if (chrome.runtime.lastError) {}
    });
  }
});