# Stage 1: Base image with Python
FROM python:3.10-slim

# Set environment variables to prevent Python from writing .pyc files
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install system dependencies, including tools to add the Chrome repository
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    wget \
    unzip \
    --no-install-recommends

# --- START OF FIX ---
# Add Google Chrome's official repository using the new recommended (and secure) method
RUN curl -sS -o - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list
# --- END OF FIX ---

# Install Google Chrome and ChromeDriver
RUN apt-get update && apt-get install -y \
    google-chrome-stable \
    chromedriver \
    --no-install-recommends

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

