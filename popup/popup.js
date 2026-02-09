const toggle = document.getElementById('toggle');
const statusLabel = document.getElementById('statusLabel');

// Load current state
chrome.runtime.sendMessage({ type: 'getState' }, (response) => {
  if (chrome.runtime.lastError || !response) return;
  toggle.checked = response.enabled;
  statusLabel.textContent = response.enabled ? 'Activo' : 'Inactivo';
});

toggle.addEventListener('change', () => {
  const newState = toggle.checked;
  statusLabel.textContent = newState ? 'Activo' : 'Inactivo';

  chrome.runtime.sendMessage({ type: 'toggle', enabled: newState }, () => {
    if (chrome.runtime.lastError) return;
    // Reload to apply/revert changes cleanly
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.reload(tabs[0].id, {}, () => {
          if (chrome.runtime.lastError) { /* tab may have closed */ }
        });
      }
    });
  });
});
