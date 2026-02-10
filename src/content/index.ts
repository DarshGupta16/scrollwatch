import browser from "webextension-polyfill";

let isBlocked = false;

const showBlockOverlay = () => {
  if (document.getElementById("scrollwatch-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "scrollwatch-overlay";
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: #050505;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 2147483647;
    font-family: 'Courier New', Courier, monospace;
    color: #eeeeee;
    text-transform: uppercase;
  `;

  overlay.innerHTML = `
    <div style="border: 1px solid #333; padding: 4rem; background: #111; max-width: 600px; width: 100%; text-align: center;">
      <div style="font-size: 4rem; font-weight: bold; margin-bottom: 2rem; letter-spacing: -2px;">LOCKED</div>
      
      <div style="height: 1px; background: #333; margin: 2rem 0;"></div>
      
      <p style="font-size: 1.2rem; color: #666; margin-bottom: 2rem; letter-spacing: 2px; line-height: 1.6;">
        PROTOCOL ENFORCED.<br>
        LIMIT EXCEEDED FOR THIS DOMAIN.
      </p>

      <div style="display: flex; justify-content: center; gap: 1rem;">
        <div style="width: 10px; height: 10px; background: #ff3333;"></div>
        <div style="width: 10px; height: 10px; background: #ff3333;"></div>
        <div style="width: 10px; height: 10px; background: #ff3333;"></div>
      </div>
      
      <div style="margin-top: 3rem; font-size: 0.8rem; color: #444;">
        ScrollWatch System v2.0
      </div>
    </div>
    <style>
      body { overflow: hidden !important; }
    </style>
  `;

  document.body.appendChild(overlay);
};

// Listen for block message
browser.runtime.onMessage.addListener((message) => {
  if (message.type === "BLOCK_PAGE") {
    isBlocked = true;
    showBlockOverlay();
  }
});

// Check for activity every second
setInterval(() => {
  if (isBlocked) {
    // Poll for unblock
    browser.runtime
      .sendMessage({ type: "CHECK_STATUS" })
      .then((response) => {
        if (!response?.isBlocked) {
          window.location.reload();
        }
      })
      .catch(() => {
        // Ignore errors
      });
    return;
  }

  // If the page is visible (user is looking at it), count it as active time
  if (!document.hidden) {
    browser.runtime
      .sendMessage({ type: "ACTIVITY_HEARTBEAT", url: window.location.href })
      .catch(() => {
        // Ignore errors (e.g. extension context invalidated)
      });
  }
}, 1000);

// Check if already blocked on load
browser.runtime.sendMessage({ type: "CHECK_STATUS" }).then((response) => {
  if (response?.isBlocked) {
    isBlocked = true;
    showBlockOverlay();
  }
});
