# Stage 1: Base image with Python
FROM python:3.10-slim

# Set environment variables to prevent Python from writing .pyc files
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# --- START OF FIX ---
# Install system dependencies, including jq to parse JSON
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    wget \
    unzip \
    jq \
    --no-install-recommends
# --- END OF FIX ---

# Add Google Chrome's official repository using the new recommended (and secure) method
RUN curl -sS -o - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/sources.list.d/google-chrome.list

# --- START OF FIX ---
# Install only Google Chrome from apt
RUN apt-get update && apt-get install -y \
    google-chrome-stable \
    --no-install-recommends

# Download and install the correct version of ChromeDriver
RUN LATEST_CHROMEDRIVER_URL=$(curl -s https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json | jq -r '.channels.Stable.downloads.chromedriver[] | select(.platform=="linux64") | .url') && \
    wget -q -O /tmp/chromedriver.zip $LATEST_CHROMEDRIVER_URL && \
    unzip -q /tmp/chromedriver.zip -d /usr/local/bin/ && \
    mv /usr/local/bin/chromedriver-linux64/chromedriver /usr/local/bin/chromedriver && \
    chmod +x /usr/local/bin/chromedriver && \
    rm /tmp/chromedriver.zip && \
    rm -rf /usr/local/bin/chromedriver-linux64
# --- END OF FIX ---

# Set up a non-root user for security
RUN useradd --create-home appuser
USER appuser

# Set the working directory
WORKDIR /home/appuser/app

# Copy and install Python dependencies
COPY --chown=appuser:appuser requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY --chown=appuser:appuser . .

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application using Gunicorn (production server)
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]

