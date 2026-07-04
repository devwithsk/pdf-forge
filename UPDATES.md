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
* **Global Bulk Upload & Selectors Upgrades:**
  * Enabled `multiple: true` on all tools (excluding interactive page editor tools: `remove-pages` and `organize-pdf`).
  * Enforced a max limit of 5 files per task inside file appenders and triggers to preserve memory and speed.
  * Configured the desktop floating FAB button to show a dynamic Plus (`+`) icon for bulk actions and a Refresh (`RefreshCw`) icon to "Change File" for single-file tools.
  * Updated the files list workspace header to show a dynamic link: `+ Add More` for bulk tools and `Change File` for single-file tools.

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

### Generic Bulk Processing Wrapper & ZIP Packaging
* **Super-Reusable Bulk Job Handler:**
  * Designed an `executeBulkJob` wrapper function in `pdfController.js` that receives requests with multiple files, processes them in sequence via Python, and packages output files into a single `.zip` file using the Node `archiver` library.
  * Rewrote all single-file endpoints (`rotate`, `protect`, `unlock`, `watermark`, `repair`, `numbers`, `pdf2jpg`, `split`, and all document conversions) to support both single-file direct download and multi-file ZIP archive download using the new helper.
  * Configured Express router routes (`pdfRoutes.js`) to support arrays of files (`upload.array('files', 5)`) for bulk uploading.

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

---

## 🛠️ 5. Interactive PDF Tools, Optimizations & Mobile Fixes

### Interactive PDF Organization & Page Tools
* **Remove Pages:**
  - Implemented interactive frontend PDF rendering using `pdfjs-dist` to display page thumbnails.
  - Hover trash overlay allows users to select/deselect pages to delete, providing clear visual states (reduced opacity and line-through labels).
* **Organize PDF:**
  - Implemented full drag-and-drop page reordering utilizing native HTML5 Drag and Drop events.
  - Interactive grid elements scale, highlight border margins, and show grip handle indicators on hover.
  - Extracted 0-based page indices array dynamically forwarded as request settings body payload.

### PDF Optimization, Recovery & Formatting
* **Compress PDF:**
  - Configured `ghostscript` installation inside `Dockerfile` to handle high-fidelity compression.
  - Upgraded the tool to support **bulk uploads** of up to 5 PDF files.
  - Spawns subprocess command `gs` mapping dynamic levels (`extreme` -> 72 dpi `/screen`, `recommended` -> 150 dpi `/ebook`, `less` -> 300 dpi `/printer`), falling back to basic pypdf stream compression if needed.
  - Automatically packages multiple outputs into a single downloadable ZIP archive.
* **Repair PDF:**
  - Implemented recovery wrapper calling `pikepdf.Pdf.open(..., recover=True)` to rebuild broken headers, trailers, or indexes.
* **Page Numbers:**
  - Added canvas generation using `reportlab.pdfgen.canvas` to write numbers onto an overlay template PDF matching original margins, then merging them together page-by-page.
  - Added sidebar controls in React allowing position alignment (bottom-center, top-right, etc.) and starting page offset.

### High-Fidelity Conversion & Mobile UX Tweaks
* **PDF-to-Image 1-Page UX Tweak:**
  - Programmed Python image converter to skip ZIP bundling for exactly 1-page PDFs. Returns direct image file path instead.
  - Configured Express downloader route to set correct MIME type headers (`image/jpeg` vs `application/zip`) dynamically.
* **FileReader Mobile Fallbacks:**
  - Replaced unstable `URL.createObjectURL` references with asynchronous `FileReader.readAsDataURL` base64 strings to prevent aggressive garbage collection on strict WebKit/mobile browsers.
  - Wrapped FileReader in an active-mount checking lifecycle, and added a safe `onError` fallback replacing broken thumbnails with generic document icons without freezing the UI thread.
  - Added direct `onClick` event listeners and `z-index` layering on mobile submission buttons to guarantee tap propagation.

### Python FastAPI Backend Migration (Phase 1 & Phase 2)
* **High-Performance FastAPI Server:**
  - Setup python package specifications (`fastapi`, `uvicorn`, `python-multipart`) and initialized app in `backend-api/main.py` listening on port `8000`.
  - Configured CORS rules to permit request sharing from cloud hosting domains and localhost.
  - Implemented secure token-based download storage (`secrets.token_hex`) in memory.
  - Wrote `/download/{token}` endpoint utilizing FastAPI `BackgroundTasks` to dynamically wipe temporary workspaces after download completion.
* **In-Process Core Route Wiring:**
  - Configured `/api/pdf2jpg` and `/api/word2pdf` endpoints importing core engine modules (`pdf_to_jpg`, `word_to_pdf`) directly.
  - Eliminates Node-to-Python subprocess execution penalties entirely by executing Python functions directly within the FastAPI process.
  - Dynamically packages multiple processed outputs into a single downloadable ZIP archive.
* **Frontend Alignment:**
  - Updated React api base URL default fallback endpoint port to `8000` inside `utils/api.js`.

