import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys

# --- Flask App Initialization ---
app = Flask(__name__)
# Set up CORS to allow requests from any origin, which is needed for our frontend.
CORS(app)

# --- Configuration ---
VONDY_URL = 'https://www.vondy.com/ai-video-generator-free-no-sign-up--P1bPH2sK'
# Path to the chromedriver executable, installed by our Dockerfile
CHROME_DRIVER_PATH = '/usr/bin/chromedriver'

@app.route('/generate-video', methods=['POST', 'OPTIONS'])
def generate_video():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    data = request.get_json()
    prompt = data.get('prompt')

    if not prompt:
        return jsonify({'message': 'Prompt text is required.'}), 400

    # Using sys.stdout.flush() is good practice for logging in containerized environments
    print(f'Received prompt: "{prompt}"', flush=True)

    driver = None  # Initialize driver to None for the finally block

    try:
        # --- Browser Setup ---
        chrome_options = webdriver.ChromeOptions()
        # Add all necessary arguments for running in a headless/Docker environment
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1280x800')
        # Spoof user agent to look like a real browser
        chrome_options.add_argument('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36')

        service = ChromeService(executable_path=CHROME_DRIVER_PATH)
        
        print('Launching browser...', flush=True)
        driver = webdriver.Chrome(service=service, options=chrome_options)

        # Set a generous timeout for page loads and finding elements
        driver.set_page_load_timeout(120) # 2 minutes for page to load
        driver.implicitly_wait(10) # Wait up to 10 seconds for elements by default

        # --- Web Automation Logic ---
        print(f'Navigating to {VONDY_URL}...', flush=True)
        driver.get(VONDY_URL)

        print('Page loaded. Clearing and typing prompt...', flush=True)
        # Explicitly wait for the textarea to be visible
        wait = WebDriverWait(driver, 60) # Wait up to 60 seconds
        text_area_selector = (By.CSS_SELECTOR, 'textarea[placeholder="Enter a brief description..."]')
        textarea = wait.until(EC.visibility_of_element_located(text_area_selector))

        # Clear the textarea reliably
        textarea.send_keys(Keys.CONTROL + "a")
        textarea.send_keys(Keys.DELETE)
        textarea.send_keys(prompt)

        print('Clicking generate button...', flush=True)
        # Wait for the button to be clickable
        generate_button_selector = (By.CSS_SELECTOR, 'button > span.relative')
        # The clickable element is the parent button
        button = wait.until(EC.element_to_be_clickable(generate_button_selector)).find_element(By.XPATH, '..')
        button.click()

        print('Waiting for video to be generated...', flush=True)
        # Wait up to 5 minutes for the video element to appear with a src attribute
        video_selector = (By.CSS_SELECTOR, 'video[src]')
        video_wait = WebDriverWait(driver, 300) # 5 minutes
        video_element = video_wait.until(EC.presence_of_element_located(video_selector))
        video_url = video_element.get_attribute('src')

        print(f'Video found! URL: {video_url}', flush=True)
        
        return jsonify({'videoUrl': video_url})

    except Exception as e:
        print(f'An error occurred: {e}', file=sys.stderr, flush=True)
        return jsonify({'message': f'Failed to generate video. Error: {e}'}), 500

    finally:
        if driver:
            print('Closing browser...', flush=True)
            driver.quit()

# This is used for local testing. Render will use Gunicorn.
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
