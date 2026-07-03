# PDFForge Project Updates Log

This document details all the new features, capabilities, and optimization updates made to the **PDFForge Decoupled Platform** since the initial baseline commit.

---

## 🎨 1. Frontend & UI/UX Upgrades (`frontend/`)

### High-Density, Professional Layout Overhaul
* **Mega Menu Navigation Upgrade:**
  * Created a robust data structure categorizing PDF utilities (Organize, Optimize, Convert, Security).
  * Added an "All PDF Tools" mega menu dropdown.
  * Solved menu viewport boundary clipping by absolute centering and screen edge bounds protection.
  * Removed obsolete/placeholder items (e.g. "Free API") to make it look professional.
* **Filter Pills Wrapping:**
  * Modified mobile dashboard tab layouts so filter pills wrap dynamically onto multiple rows instead of requiring horizontal scrolling, fitting all conversion actions in the active viewport.
* **Premium ToolCard Redesigns:**
  * Enlarged card layout styling matching professional utility platforms (similar to iLovePDF).
  * Visual weights: Enlarged Lucide SVG icons, placed bold descriptions, and added sleek transitions.
  * Replaced the "Start Tool ->" buttons. The entire card operates as a unified clickable trigger.
  * Responsive 1-column layout mapping on mobile viewports for clean vertical listing.
* **Layout Configuration Settings Card:**
  * Added a configuration drawer inside the Image to PDF workspace allowing custom paper sizes (`A4`, `Letter`, `Auto`) and orientations (`Portrait`, `Landscape`).
  * Added dynamic checks wrapping the conversion modes selector (Merge all images vs individual PDFs); options are auto-hidden if only a single file is uploaded.
* **Custom Favicon Branding:**
  * Replaced the default React favicon with a customized logo vector icon reflecting the platform's utility purpose.

---

## 🚀 2. Backend & Controller Refactoring (`backend-api/`)

### Network, Port, & Deployment Bindings
* **Port and Binding Configurations:**
  * Changed the default Express listening port from `5000` to `7860` and explicitly bound it to host `0.0.0.0` to permit deployments on Hugging Face Docker Spaces.
* **Cross-Origin Resource Sharing (CORS):**
  * Added and configured the `cors` package to allow secure requests from Netlify and Cloudflare frontends, as well as localhost environments.
* **Absolute Deep-Route Routing Resolution:**
  * Rewrote Axios base path builders in `api.js` to construct absolute origins based on the browser viewport context (`window.location.origin`), fixing deep subroute "Network Error" alerts on hard page refreshing.
* **Order-Aware Form Boundary Parsing:**
  * Restructured `FormData` serialization streams to append all textual configurations before binary files. This prevents Multer parsers on cloud container hosts from returning empty request bodies.

### Secure File Downloads & Sanitized Errors
* **Exposure-Free File Downloader:**
  * Replaced standard download links pointing directly to raw backend URLs with secure AJAX requests.
  * Downloads are requested as blobs, processed via virtual object URLs, triggered through hidden anchor elements, and cleaned up using `URL.revokeObjectURL()`. This hides api keys and system paths from the browser address bar.
* **Error Sanitizer Engine:**
  * Created a global error message clean-up middleware resolving technical stack traces and path references (such as `/app/backend-api/uploads/...`) to base file names.
  * Password decryption failures are cleaned and simplified to a user-facing `"Failed to decrypt PDF: invalid password"`.

---

## 🧠 3. Processing Core Engine Upgrades (`python-engine/`)

### Document & File Conversion Additions
* **4 New PDF Utilities:**
  1. **PowerPoint to PDF:** Renders PPTX presentations to pages.
  2. **HTML to PDF:** Converts custom html code formats to PDF.
  3. **PDF to Excel:** Parses and extracts tables from PDF documents into editable `.xlsx` worksheets.
  4. **PDF to PowerPoint:** Generates editable PPTX presentations from PDF pages.
* **Clarified Renaming:**
  * Renamed the "JPG to PDF" and "PDF to JPG" tools to **Image to PDF** and **PDF to Image** respectively, highlighting cross-format support for PNG, JPEG, and JPG formats.

### Layout Placement & ZIP Compilation Upgrades
* **ReportLab Layout Compiler:**
  * Replaced the basic Pillow script engine with ReportLab's `canvas.Canvas` renderer.
  * Added aspect-ratio preserving scaling to prevent image distortion.
  * Integrated a 20mm margin (56.7 points) for A4 and Letter pages, while supporting zero-margin auto-dimensions.
  * Implemented mathematical page centering calculation: `x_offset = (page_width - new_width) / 2.0`.
* **Individual Zipped PDF Export:**
  * Programmed individual conversion compiler writing each image as a separate PDF and bundling them inside a single `.zip` file.
  * Deduplicated file output names inside the ZIP to prevent runtime warnings or file overwrite problems.
* **CLI Positional Argument Parser:**
  * Rewrote the entrypoint of `image_convert.py` to parse positional parameters (`sys.argv[1..6]`), while falling back to stdin JSON streaming for integration tests compatibility.

---

## 🐳 4. Orchestration & Dockerization (`/`)

### 1-Click Startup Script
* Created **`run.bat`** at the workspace root to check node dependencies and concurrently start frontend development nodes and backend API processes with single-click ease.
* Tuned backend references inside `run.bat` to utilize the new port `7860`.

### Hugging Face Docker Container Config
* Built a custom **`Dockerfile`** targeting Hugging Face Space constraints:
  * Uses `python:3.10-slim` base image.
  * Installs Node.js 18.x and native compiler commands (`curl`, `poppler-utils`).
  * Resolves python dependencies in virtual environments and manages node packages.
  * Runs both servers simultaneously from a single container entry point.
