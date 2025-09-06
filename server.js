// This is our backend server. It uses Express for the web server and Puppeteer to control the browser.
const express = require('express');
const puppeteer = require('puppeteer-core');
const cors = require('cors');
const fs = require('fs'); // We need the file system module to check for file existence

const app = express();
const port = process.env.PORT || 3000;

// Use a more explicit CORS configuration to handle preflight requests.
const corsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

const VONDY_URL = 'https://www.vondy.com/ai-video-generator-free-no-sign-up--P1bPH2sK';


// --- START OF NEW, MORE ROBUST FIX ---
// This function will find the path to the Chrome executable.
const getChromePath = () => {
  // 1. Check the environment variable first.
  let executablePath = process.env.GOOGLE_CHROME_BIN;
  
  // 2. If the env var is not set, check a list of common Linux paths.
  if (!executablePath) {
    const commonPaths = [
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/opt/google/chrome/chrome',
    ];

    for (const path of commonPaths) {
      if (fs.existsSync(path)) {
        executablePath = path;
        break; // Stop searching once we find one.
      }
    }
  }

  return executablePath;
};
// --- END OF NEW, MORE ROBUST FIX ---


app.post('/generate-video', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ message: 'Prompt text is required.' });

    console.log(`Received prompt: "${prompt}"`);
    let browser = null;

    try {
        const chromePath = getChromePath();
        console.log(`Found Chrome executable at: ${chromePath}`);

        if (!chromePath) {
          throw new Error('Could not find a compatible Chrome installation.');
        }

        console.log('Launching browser...');
        browser = await puppeteer.launch({
            executablePath: chromePath, // Use the path we found
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process'
            ]
        });
        const page = await browser.newPage();
        
        await page.setCacheEnabled(false);
        await page.setDefaultNavigationTimeout(60000);

        console.log(`Navigating to ${VONDY_URL}...`);
        await page.goto(VONDY_URL, { waitUntil: 'networkidle2' });

        console.log('Page loaded. Clearing and typing prompt...');
        const textAreaSelector = 'textarea[placeholder="Enter a brief description..."]';
        await page.waitForSelector(textAreaSelector);

        await page.focus(textAreaSelector);
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');

        await page.type(textAreaSelector, prompt);

        console.log('Clicking generate button...');
        const generateButtonSelector = 'button > span.relative';
        await page.waitForSelector(generateButtonSelector);

        const textInApiSite = await page.$eval(textAreaSelector, el => el.value);
        console.log(`Text in API site textbox before clicking: "${textInApiSite}"`);

        await page.evaluate((selector) => {
            const span = document.querySelector(selector);
            if (span) span.closest('button').click();
        }, generateButtonSelector);

        console.log('Waiting for video to be generated... This might take a few minutes.');
        const videoSelector = 'video[src]';
        await page.waitForSelector(videoSelector, { timeout: 300000 }); // 5 minutes timeout

        console.log('Video found! Extracting URL...');
        const videoUrl = await page.$eval(videoSelector, el => el.src);

        console.log(`Video URL: ${videoUrl}`);
        res.json({ videoUrl });

    } catch (error) {
        console.error('An error occurred during video generation:', error);
        res.status(500).json({ message: 'Failed to generate video. The process may have timed out or the API site changed.' });
    } finally {
        if (browser) {
            console.log('Closing browser...');
            await browser.close();
        }
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log('Waiting for requests from the frontend...');
});

