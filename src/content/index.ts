let isBlocked = false;

const showBlockOverlay = () => {
  if (document.getElementById('scrollwatch-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'scrollwatch-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(255, 255, 255, 0.98);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1f2937;
  `;

  overlay.innerHTML = `
    <div style="text-align: center; padding: 2rem; border-radius: 1rem; background: white; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);">
      <div style="font-size: 5rem; margin-bottom: 1rem;">🔒</div>
      <h1 style="font-size: 2rem; font-weight: 800; margin-bottom: 0.5rem; color: #f43f5e;">Scrolling Locked!</h1>
      <p style="font-size: 1.125rem; color: #4b5563; max-width: 300px; margin: 0 auto;">
        You've hit your limit. Come back after your reset duration.
      </p>
      <div style="margin-top: 2rem; height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden;">
        <div style="width: 100%; height: 100%; background: #6366f1; animation: pulse 2s infinite;"></div>
      </div>
    </div>
    <style>
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }
      body { overflow: hidden !important; }
    </style>
  `;

  document.body.appendChild(overlay);
};

// Listen for block message
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'BLOCK_PAGE') {
    isBlocked = true;
    showBlockOverlay();
  }
});

// Detect scrolling
let scrollTimeout: any;
window.addEventListener('scroll', () => {
  if (isBlocked) return;

  if (!scrollTimeout) {
    chrome.runtime.sendMessage({ type: 'SCROLL_ACTIVITY' });
    scrollTimeout = setTimeout(() => {
      scrollTimeout = null;
    }, 1000); // Send once per second while scrolling
  }
}, { passive: true });

// Check if already blocked on load
chrome.runtime.sendMessage({ type: 'CHECK_STATUS' }, (response) => {
  if (response?.isBlocked) {
    isBlocked = true;
    showBlockOverlay();
  }
});
