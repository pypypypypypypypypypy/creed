FROM node:22.12-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        python3 \
        libcairo2-dev \
        libpango1.0-dev \
        libjpeg-dev \
        libgif-dev \
        librsvg2-dev \
        libavcodec-dev \
        libavformat-dev \
        libavutil-dev \
        libopus-dev \
        libsodium-dev \
    && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install

COPY . .

CMD ["sh", "start.sh"]
