// This is our backend server. It uses Express for the web server and Puppeteer to control the browser.
const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000; // Use port from environment variable or default to 3000

// Middleware to allow our frontend to communicate with this server
app.use(cors());
app.use(express.json());

const VONDY_URL = 'https://www.vondy.com/ai-video-generator-free-no-sign-up--P1bPH2sK';

// API endpoint that our frontend will call
app.post('/generate-video', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ message: 'Prompt text is required.' });
    }

    console.log(`Received prompt: "${prompt}"`);
    let browser = null;

    try {
        console.log('Launching browser...');
        browser = await puppeteer.launch({ 
            headless: true, // Set to false to see the browser window
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        // Increase navigation timeout
        await page.setDefaultNavigationTimeout(60000); 

        console.log(`Navigating to ${VONDY_URL}...`);
        await page.goto(VONDY_URL, { waitUntil: 'networkidle2' });

        console.log('Page loaded. Typing prompt...');
        // Wait for the textarea and type the prompt
        const textAreaSelector = 'textarea[placeholder="Enter a brief description..."]';
        await page.waitForSelector(textAreaSelector);
        await page.type(textAreaSelector, prompt);

        console.log('Clicking generate button...');
        // Wait for the button and click it
        const generateButtonSelector = 'button > span.relative';
        await page.waitForSelector(generateButtonSelector);
        
        // Using page.evaluate to click the element to be more robust
        await page.evaluate((selector) => {
            document.querySelector(selector).click();
        }, generateButtonSelector);


        console.log('Waiting for video to be generated... This might take a few minutes.');
        // Wait for the video tag with a 'src' attribute to appear.
        // We set a long timeout (5 minutes) because generation can be slow.
        const videoSelector = 'video[src]';
        await page.waitForSelector(videoSelector, { timeout: 300000 }); // 5 minutes timeout

        console.log('Video found! Extracting URL...');
        // Extract the src attribute from the video element
        const videoUrl = await page.$eval(videoSelector, el => el.src);
        
        console.log(`Video URL: ${videoUrl}`);

        // Send the URL back to the frontend
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

