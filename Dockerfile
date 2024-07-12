FROM ghcr.io/puppeteer/puppeteer:22.12.1

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci
COPY . .

# Expose the port your app runs on
EXPOSE 10000

CMD ["node", "server.js"]