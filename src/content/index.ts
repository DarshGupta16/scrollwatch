import browser from "webextension-polyfill";
import { normalizeDomain } from "../utils/domain";
import { ExtensionMessage, StatusResponse } from "../utils/messaging";

let isBlocked = false;
const normalizedDomain = normalizeDomain(window.location.hostname);

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

// Listen for messages from background
browser.runtime.onMessage.addListener((message: unknown) => {
  const msg = message as ExtensionMessage;
  if (msg.type === "BLOCK_PAGE") {
    isBlocked = true;
    showBlockOverlay();
  } else if (msg.type === "UNBLOCK_PAGE") {
    isBlocked = false;
    const overlay = document.getElementById("scrollwatch-overlay");
    if (overlay) overlay.remove();
    window.location.reload();
  }
});

// Metronome: Emit TICK every second
setInterval(() => {
  if (isBlocked) {
    // Poll for unblock status when already blocked
    (browser.runtime
      .sendMessage({ type: "CHECK_STATUS", domain: normalizedDomain } as ExtensionMessage) as Promise<StatusResponse>)
      .then((response) => {
        if (!response?.isBlocked) {
          isBlocked = false;
          const overlay = document.getElementById("scrollwatch-overlay");
          if (overlay) overlay.remove();
          window.location.reload();
        }
      })
      .catch(() => {});
    return;
  }

  if (!document.hidden) {
    browser.runtime
      .sendMessage({
        type: "TICK",
        domain: normalizedDomain,
        timestamp: Date.now(),
      } as ExtensionMessage)
      .catch(() => {
        // Ignore errors (e.g. extension context invalidated)
      });
  }
}, 1000);

// Initial status check
(browser.runtime.sendMessage({ type: "CHECK_STATUS", domain: normalizedDomain } as ExtensionMessage) as Promise<StatusResponse>).then((response) => {
  if (response?.isBlocked) {
    isBlocked = true;
    showBlockOverlay();
  }
});
