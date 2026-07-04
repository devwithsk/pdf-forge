# Use Python 3.10 slim as the base image
FROM python:3.10-slim

# Install system dependencies (curl, gnupg, poppler-utils, and libreoffice for high-fidelity conversions)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    poppler-utils \
    libreoffice \
    fonts-dejavu-core \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 18.x via NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Set working directory to /app
WORKDIR /app

# Copy the python-engine folder and install python requirements globally in container
COPY python-engine /app/python-engine
RUN pip install --no-cache-dir -r /app/python-engine/requirements.txt

# Copy the backend-api folder and install node packages
COPY backend-api /app/backend-api
WORKDIR /app/backend-api
RUN npm install

# Expose Hugging Face Space port
EXPOSE 7860

# Define env variables (set default port if not set by host)
ENV PORT=7860

# Start Express Server
CMD ["node", "server.js"]
