// This is our backend server. It uses Express for the web server and Puppeteer to control the browser.
const express = require('express');
const puppeteer = require('puppeteer-core');
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
        const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        console.log(`Launching browser with explicit path: ${executablePath}`);

        if (!executablePath) {
             throw new Error('FATAL: PUPPETEER_EXECUTABLE_PATH environment variable is not set or not found.');
        }

        // --- START OF FINAL FIX ---
        // Add an explicit timeout to the browser launch itself.
        browser = await puppeteer.launch({
            executablePath,
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process'
            ],
            timeout: 60000 // 1 minute timeout for launch
        });
        
        const page = await browser.newPage();
        
        // 1. Set a realistic User-Agent to avoid being detected as a bot.
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');
        
        // 2. Set a standard viewport size.
        await page.setViewport({ width: 1280, height: 800 });
        
        await page.setCacheEnabled(false);

        console.log(`Navigating to ${VONDY_URL}...`);
        // 3. Use 'networkidle0' and an explicit, long timeout for navigation.
        await page.goto(VONDY_URL, { 
            waitUntil: 'networkidle0',
            timeout: 120000 // 2 minute timeout for page load
        });
        console.log(`Navigation successful. Page is fully loaded.`);
        // --- END OF FINAL FIX ---

        console.log('Finding textarea to clear and type prompt...');
        const textAreaSelector = 'textarea[placeholder="Enter a brief description..."]';
        // Add an explicit timeout for waiting for the element
        await page.waitForSelector(textAreaSelector, { timeout: 60000 }); // 1 minute timeout

        await page.focus(textAreaSelector);
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');

        await page.type(textAreaSelector, prompt);

        console.log('Clicking generate button...');
        const generateButtonSelector = 'button > span.relative';
        // Add an explicit timeout for waiting for the element
        await page.waitForSelector(generateButtonSelector, { timeout: 60000 }); // 1 minute timeout

        const textInApiSite = await page.$eval(textAreaSelector, el => el.value);
        console.log(`Text in API site textbox before clicking: "${textInApiSite}"`);

        await page.evaluate((selector) => {
            const span = document.querySelector(selector);
            if (span) span.closest('button').click();
        }, generateButtonSelector);

        console.log('Waiting for video to be generated... This might take a few minutes.');
        const videoSelector = 'video[src]';
        await page.waitForSelector(videoSelector, { timeout: 300000 }); // 5 minutes timeout for video generation itself

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

