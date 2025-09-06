// This is our backend server. It uses Express for the web server and Puppeteer to control the browser.
const express = require('express');
// --- START OF DEFINITIVE FIX ---
// Switch back to the full puppeteer package, as per the user's working code.
const puppeteer = require('puppeteer');
// --- END OF DEFINITIVE FIX ---
const cors = require('cors');

const app = express();
// Koyeb sets the PORT environment variable for you.
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

app.post('/generate-video', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ message: 'Prompt text is required.' });

    console.log(`Received prompt: "${prompt}"`);
    let browser = null;

    try {
        console.log(`Launching browser...`);
        // --- START OF DEFINITIVE FIX ---
        // Use the simplified launch method from the full puppeteer package.
        // It will automatically use its own bundled, compatible version of Chromium.
        // All executablePath logic has been removed.
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Recommended for Docker environments
                '--single-process'
            ],
            timeout: 60000 // 1 minute timeout for launch
        });
        // --- END OF DEFINITIVE FIX ---
        
        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });
        await page.setCacheEnabled(false);

        console.log(`Navigating to ${VONDY_URL}...`);
        // Using networkidle2 as per your working local code, with a long timeout for safety.
        await page.goto(VONDY_URL, { 
            waitUntil: 'networkidle2',
            timeout: 120000 // 2 minute timeout for page load
        });
        console.log(`Navigation successful. Page is loaded.`);

        console.log('Finding textarea to clear and type prompt...');
        const textAreaSelector = 'textarea[placeholder="Enter a brief description..."]';
        await page.waitForSelector(textAreaSelector, { timeout: 60000 });

        await page.focus(textAreaSelector);
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await page.type(textAreaSelector, prompt);

        console.log('Clicking generate button...');
        const generateButtonSelector = 'button > span.relative';
        await page.waitForSelector(generateButtonSelector, { timeout: 60000 });

        const textInApiSite = await page.$eval(textAreaSelector, el => el.value);
        console.log(`Text in API site textbox before clicking: "${textInApiSite}"`);

        await page.evaluate((selector) => {
            const span = document.querySelector(selector);
            if (span) span.closest('button').click();
        }, generateButtonSelector);

        console.log('Waiting for video to be generated... This might take a few minutes.');
        const videoSelector = 'video[src]';
        await page.waitForSelector(videoSelector, { timeout: 300000 });

        console.log('Video found! Extracting URL...');
        const videoUrl = await page.$eval(videoSelector, el => el.src);

        console.log(`Video URL: ${videoUrl}`);
        res.json({ videoUrl });

    } catch (error)
    {
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

