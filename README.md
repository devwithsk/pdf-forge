---
title: Pdf Forge Backend
emoji: 🤗
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# PDFForge - Decoupled Online PDF Utility Platform

PDFForge is a lightning-fast, secure, and 100% free online PDF utility platform. The site is designed to capture organic search traffic (SEO) and monetize through Google AdSense, providing premium services with **zero sign-up walls**.

---

## 🛠️ Architecture & Tech Stack

The project uses a decoupled, three-tier microservice style:

1. **Frontend (UI/UX):** Built with **React (Vite)** and **Tailwind CSS v4**. Implements responsive web layouts, custom typography (Inter font), high-attention AdSense placements, and intuitive drag-and-drop workspace triggers.
2. **Backend API (Controller):** Powered by **Node.js** and **Express.js**. Manages file streams using `multer`, rate-limits requests, handles database analytics, and spawns Python processes to execute document modifications.
3. **Processing Engine (The Brain):** Pure **Python** modules wrapped in a virtual environment (`venv`). It runs robust scripts using `pypdf`, `pikepdf`, `pdf2image`, `pdf2docx`, `openpyxl`, and `reportlab`.

---

## 📂 Repository Structure

```text
pdf-utility-platform/
│
├── Dockerfile                    # Container configuration file for deployment
├── run.bat                       # 1-Click Startup script for Windows
├── UPDATES.md                    # Changelog listing updates since baseline commit
├── README.md                     # Project overview and execution guide
│
├── frontend/                     # React Client Application
│   ├── src/
│   │   ├── components/           # Navbar, Footer, AdBanners, DragDropZone
│   │   ├── pages/                # Home Dashboard, Tool, and Download Screens
│   │   ├── context/              # AppState Context (global states)
│   │   └── utils/                # Axios API configurations
│   └── package.json
│
├── backend-api/                  # Node.js + Express API
│   ├── config/                   # MongoDB connection config
│   ├── controllers/              # Request parsing & python runners
│   ├── middlewares/              # File uploads (Multer) & Rate limiting
│   ├── routes/                   # Routing endpoints
│   ├── models/                   # Analytics and Error Schemas
│   ├── uploads/                  # Temporary cache folder for input files
│   └── processed/                # Temporary cache folder for output files
│
└── python-engine/                # Python Core Logic
    ├── modules/                  # Conversion and manipulation scripts
    ├── tests/                    # Automation local test scripts
    └── requirements.txt          # Python package requirements
```

---

## 🚀 Setup & Execution Guide

### ⚡ 1-Click Startup (Windows)
To run the entire platform at once, simply double-click the **`run.bat`** file in the root workspace directory. It will:
- Check if `node_modules` are installed for the frontend and backend (installing them if missing).
- Start the Backend API Server on `http://localhost:7860` in a dedicated console window.
- Start the Frontend Client on `http://localhost:5173` in a second dedicated console window.

---

### 🐳 Docker Deployment (Decoupled Spaces)
This project is configured to run inside a single container (such as Hugging Face Spaces or custom Docker hosts) using the root `Dockerfile`:
- Uses `python:3.10-slim` as the base image.
- Installs Node.js 18.x, system tools, and `poppler-utils` dependencies.
- Sets up python core libraries (`reportlab`, `pikepdf`, `pdf2image`, `openpyxl`, etc.).
- Exposes port `7860` and starts the Node.js API server which acts as the application entry point.

---

### Manual Setup & Execution

If you prefer to run services manually, follow the individual steps below:

### 1. Processing Engine Setup (Python)

Ensure Python 3.10+ is installed.

```bash
# Navigate to python engine folder
cd python-engine

# Create virtual environment
py -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

> [!NOTE]
> For **PDF to Image** conversion, the engine uses `pdf2image` which requires **Poppler**. Install poppler on your system and add the `bin/` folder to your environment system PATH.

### 2. Backend API Setup (NodeJS)

MongoDB is recommended for conversion stats and error logging. The backend falls back to standard execution if MongoDB is not running locally.

```bash
# Navigate to backend API folder
cd ../backend-api

# Install npm packages
npm install

# Start Express server (runs on http://localhost:7860)
npm run dev
```

### 3. Frontend Client Setup (React)

```bash
# Navigate to frontend folder
cd ../frontend

# Install dependencies
npm install

# Start local development server (runs on http://localhost:5173)
npm run dev
```

---

## ⚙️ Core Modules & Capabilities

All tools (except single-file visual page editors like Remove Pages and Organize PDF) fully support **bulk file processing** (up to 5 files simultaneously). Single processed files are downloaded directly, while multiple files are automatically processed and bundled into a single ZIP archive.

### Module 1: Basic File Manipulation & Organization
* **Merge PDF:** Combine multiple PDF documents in a sorted sequence.
* **Split PDF:** Extract a custom page range or split all pages into individual files bundled in a ZIP.
* **Rotate PDF:** Rotate pages clockwise by 90, 180, or 270 degrees.
* **Remove Pages:** Interactively preview and permanently delete unwanted pages from your PDF document.
* **Organize PDF:** Drag and drop page thumbnails to freely reorder pages in a PDF document.

### Module 2: Security & Formatting
* **Protect PDF:** Encrypt a PDF with password security.
* **Unlock PDF:** Decrypt an owner-secured PDF using its password. Sanitizes paths and presents friendly errors to the user.
* **Watermark PDF:** Stamp rotated custom text watermarks onto all pages matching target dimensions.
* **Page Numbers:** Overlay custom page numbers at target positions (e.g., bottom center, top right) with configurable starting number.

### Module 3: Image Conversion
* **PDF to Image (JPG/PNG):** Convert each page of a PDF file to images. Automatically bypasses ZIP bundling for single-page PDFs, serving the raw image directly for an improved UX.
* **Image to PDF (JPG/JPEG/PNG):** Build a unified PDF from multiple image uploads with A4, US Letter, or Auto page sizes, Portrait/Landscape orientations, and a layout alignment engine. Supports individual ZIP archive packaging.

### Module 4: Document Conversion
* **Word to PDF:** Render `.docx` files to PDF. (Includes a Windows Word COM automated bridge with portable Python fallback).
* **Excel to PDF:** Render `.xlsx` sheets to PDF pages dynamically formatted in landscape.
* **PowerPoint to PDF:** Render PowerPoint files (`.pptx`) to PDF pages.
* **HTML to PDF:** Convert custom HTML files/pages to PDF format.
* **PDF to Word:** Convert PDF documents back to editable Microsoft Word documents (`.docx`).
* **PDF to Excel:** Extract PDF tables into editable Excel spreadsheets (`.xlsx`).
* **PDF to PowerPoint:** Convert PDF pages into editable PowerPoint presentation slides (`.pptx`).

### Module 5: PDF Optimization & Repair
* **Compress PDF:** Reduce PDF size in bulk (up to 5 files) using Ghostscript presets with three customizable levels: Extreme (72 dpi), Recommended (150 dpi), or Less (300 dpi) compression (with lossless fallback). Multi-file tasks are dynamically zipped into a single archive for the user.
* **Repair PDF:** Automatically recover, fix, and rebuild corrupted or damaged PDF structures using `pikepdf`.

---

## 💵 Strategic Ad Placements (Monetization)
We placed simulated AdSense modules to maximize click-through rate (CTR) without disturbing the user:
1. **Header Leaderboard (728x90):** Directly beneath navigation headers.
2. **Desktop Skyscraper Sidebars (160x600):** Side spaces flanking the main upload layout.
3. **Processing Loader Banner (336x280):** High-attention rectangle under the loading spinner.
4. **Download Banners (300x250):** Placed directly above and below the final download button.
5. **Mobile Sticky Anchor (320x50):** Sticky bar pinned to the bottom of mobile viewport screen.

---

## 🧹 Security & Storage Maintenance
To prevent storage build-ups on your server, the backend runs a **cleanup daemon** every 15 minutes that deletes uploads and converted output files older than 30 minutes.
