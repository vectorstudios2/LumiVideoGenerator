# Use an official Node.js runtime as a parent image
FROM node:18-slim

# Set the working directory in the container
WORKDIR /app

# --- START OF DEFINITIVE FIX ---
# Install necessary dependencies for Puppeteer's bundled Chromium.
# We are NO LONGER installing Google Chrome manually.
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    --no-install-recommends

# Copy package.json and package-lock.json
COPY package*.json ./

# --- We are now installing the FULL puppeteer package, which downloads its own browser ---
RUN npm install

# Copy the rest of your application's code
COPY . .

# Your app binds to this port
EXPOSE 3000

# Command to run your app
CMD ["node", "server.js"]

