import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple file server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(fs.readFileSync(path.join(__dirname, 'test-page.html')));
});

const PORT = 8080;
const LOCAL_TEST_URL = `http://localhost:${PORT}`;

(async () => {
  server.listen(PORT);
  console.log(`Test server running at ${LOCAL_TEST_URL}`);

  const extensionPath = path.resolve(__dirname, '../dist');
  
  if (!fs.existsSync(extensionPath)) {
    console.error('Error: "dist" folder not found. Run "npm run build" first.');
    process.exit(1);
  }

  console.log('Launching Chrome with extension...');
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ],
  });

  try {
    // Wait for extension to load
    await new Promise(r => setTimeout(r, 2000));
    
    // Find Extension ID
    let extensionId = '';
    console.log('Searching for extension target...');
    
    // Try to find any target that belongs to our extension
    const targets = await browser.targets();
    for (const target of targets) {
      const url = target.url();
      if (url.startsWith('chrome-extension://')) {
        extensionId = url.split('/')[2];
        console.log(`Found extension ID from target ${url}: ${extensionId}`);
        break;
      }
    }

    if (!extensionId) {
      console.log('Target not found, checking chrome://extensions...');
      const extPage = await browser.newPage();
      await extPage.goto('chrome://extensions', { waitUntil: 'networkidle2' });
      extensionId = await extPage.evaluate(() => {
        try {
          const manager = document.querySelector('extensions-manager');
          const itemList = manager.shadowRoot.querySelector('extensions-item-list');
          const items = itemList.shadowRoot.querySelectorAll('extensions-item');
          for (const item of items) {
             const name = item.shadowRoot.querySelector('#name').textContent;
             if (name.toLowerCase().includes('scrollwatch')) {
               return item.id;
             }
          }
        } catch (e) {
          return '';
        }
        return '';
      });
      await extPage.close();
    }

    if (!extensionId) {
       // Last resort: query all targets again after a longer wait
       await new Promise(r => setTimeout(r, 3000));
       const finalTargets = await browser.targets();
       for (const target of finalTargets) {
         if (target.url().startsWith('chrome-extension://')) {
           extensionId = target.url().split('/')[2];
           break;
         }
       }
    }

    if (!extensionId) throw new Error('Could not find Extension ID');
    console.log(`Final Extension ID: ${extensionId}`);

    // Open Options Page
    const optionsPage = await browser.newPage();
    await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
    
    // Navigate to Command Center
    console.log('Switching to Commands tab...');
    await optionsPage.waitForSelector('button');
    const tabs = await optionsPage.$$('button');
    let commandTabFound = false;
    for (const tab of tabs) {
      const text = await tab.evaluate(el => el.textContent);
      if (text && (text.includes('Command Center') || text.includes('COMMAND CENTER'))) {
        await tab.click();
        commandTabFound = true;
        // Wait for the form to appear to confirm switch
        await optionsPage.waitForSelector('input[placeholder="twitter.com"]', { visible: true });
        break;
      }
    }
    if (!commandTabFound) throw new Error('Could not find Command Center tab button');
    
    // Helper function to run a test case
    const runTest = async (domain, url) => {
      console.log(`\n--- START TEST: ${domain} ---`);
      
      // 1. Add Rule
      await optionsPage.bringToFront();
      
      // Wait for input to be interactable
      const inputSelector = 'input[placeholder="twitter.com"]';
      await optionsPage.waitForSelector(inputSelector);
      
      console.log(`Adding rule for ${domain} (5s limit)...`);
      await optionsPage.type(inputSelector, domain);
      
      // Configure Time (Reset Minutes to 00, Seconds to 05)
      // Note: Inputs reset to Default (0h 50m 0s) after submission in React? 
      // Actually Dashboard.tsx state: durationTime defaults to 0:50:0. 
      // We must clear it every time.
      
      const timeInputs = await optionsPage.$$('input[placeholder="00"]');
      // Index 1: Duration Minutes
      await timeInputs[1].click({ clickCount: 3 });
      await timeInputs[1].type('00');
      
      // Index 2: Duration Seconds
      await timeInputs[2].click({ clickCount: 3 });
      await timeInputs[2].type('05');
      
      // Index 3: Reset Hours (Set to 0)
      await timeInputs[3].click({ clickCount: 3 });
      await timeInputs[3].type('00');

      // Index 5: Reset Seconds (Set to 15s)
      // Inputs are: D_H, D_M, D_S, R_H, R_M, R_S
      await timeInputs[5].click({ clickCount: 3 });
      await timeInputs[5].type('15');
      
      // Submit
      const submitBtn = await optionsPage.$('button[type="submit"]');
      await submitBtn.click();
      
      // Verify Rule Added in UI
      await optionsPage.waitForSelector('h3', { text: domain, visible: true });
      console.log(`Rule for ${domain} confirmed in UI.`);

      // 2. Test Blocking Cycle (Loop twice)
      let page;
      for (let cycle = 1; cycle <= 2; cycle++) {
        console.log(`\n--- Cycle ${cycle}: Blocking... ---`);
        console.log(`Navigating to ${url}...`);
        
        // On Cycle 2, we might already be on the page, but reload to be safe/fresh
        if (cycle === 1) {
            page = await browser.newPage();
            // Capture logs
            page.on('console', msg => {
                if (msg.type() === 'error') return;
            });
            await page.goto(url);
            await page.bringToFront();
        } else {
            // Reload for fresh start in cycle 2
             await page.reload();
        }

        console.log('Waiting for block (limit is 5s)...');
        
        // Simulate interaction
        const interact = setInterval(async () => {
             try { await page.evaluate(() => { window.scrollBy(0, 50); }); } catch {}
        }, 500);
        
        // Wait for overlay to appear (max 10s)
        try {
            await page.waitForSelector('#scrollwatch-overlay', { visible: true, timeout: 12000 });
            
            const text = await page.$eval('#scrollwatch-overlay', el => el.innerText);
            if (text.includes('LOCKED')) {
                console.log(`SUCCESS: ${domain} blocked correctly (Cycle ${cycle}).`);
            } else {
                console.warn(`WARNING: Overlay found on ${domain} but text mismatch.`);
            }
        } catch (e) {
            console.error(`FAILURE: ${domain} was NOT blocked (Cycle ${cycle}). Timeout or Error.`);
            // Dump storage
            const data = await optionsPage.evaluate(() => chrome.storage.local.get(null));
            console.log('Storage Dump:', JSON.stringify(data, null, 2));
            clearInterval(interact);
            throw e;
        }
        clearInterval(interact);

        // 3. Test Unblocking
        console.log(`--- Cycle ${cycle}: Unblocking... ---`);
        console.log(`Waiting for Reset Interval (15s total) to pass...`);
        
        // We still need to wait for the TIME to pass on the server/background.
        // The block happened at ~5s. Reset is at 15s.
        // We just waited ~5s (until block).
        // So we need to wait ~10s more.
        await new Promise(r => setTimeout(r, 11000)); // 11s to be safe

        // Wait for overlay to disappear
        try {
            await page.waitForSelector('#scrollwatch-overlay', { hidden: true, timeout: 5000 });
             console.log(`SUCCESS: ${domain} unblocked correctly (Cycle ${cycle}).`);
        } catch (e) {
             console.error(`FAILURE: ${domain} is STILL blocked after reset interval (Cycle ${cycle}).`);
             const data = await optionsPage.evaluate(() => chrome.storage.local.get(null));
             console.log('Storage Dump:', JSON.stringify(data, null, 2));
             throw e;
        }
      }
      
      if (page) await page.close();
    };

    // RUN TESTS
    await runTest('localhost', LOCAL_TEST_URL);
    await runTest('example.com', 'https://example.com');
    
    // Note: x.com might have complex redirects or service workers, but basic overlay should work
    // Use twitter.com/x.com depending on what the browser resolves to. 
    // The extension normalizes.
    await runTest('x.com', 'https://x.com');

    console.log('\nALL TESTS PASSED.');

  } catch (e) {
    console.error('\nTEST SUITE FAILED:', e);
    process.exit(1);
  } finally {
    console.log('Closing browser...');
    await browser.close();
    server.close();
  }
})();