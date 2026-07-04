import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import DragDropZone from '../components/DragDropZone';
import ProcessingOverlay from '../components/ProcessingOverlay';
import AdBanner from '../components/AdBanner';
import PDFPageGrid from '../components/PDFPageGrid';
import api from '../utils/api';
import { ArrowLeft, ArrowRight, Check, ShieldAlert, Download, RefreshCw, FileCheck, Plus, Trash2, File } from 'lucide-react';

const FilePreviewCard = ({ file, index, totalFiles, onRemove, onMoveLeft, onMoveRight, isMultiple, formatSize }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!file.type.startsWith('image/')) return;

    let active = true;
    const reader = new FileReader();

    reader.onloadend = () => {
      if (active) {
        setPreviewUrl(reader.result);
      }
    };

    reader.onerror = () => {
      if (active) {
        setImgError(true);
      }
    };

    try {
      reader.readAsDataURL(file);
    } catch {
      if (active) {
        setImgError(true);
      }
    }

    return () => {
      active = false;
    };
  }, [file]);

  return (
    <div className="relative bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col items-center justify-between shadow-sm hover:shadow-md transition-all group aspect-[3/4] w-full max-w-[160px] mx-auto">
      {/* Index Badge */}
      <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-black shadow-sm z-10">
        {index + 1}
      </div>

      {/* Thumbnail/Icon Area */}
      <div className="flex-1 w-full flex items-center justify-center overflow-hidden rounded-xl bg-slate-50 border border-slate-100 mb-3 relative min-h-0">
        {previewUrl && !imgError ? (
          <img
            src={previewUrl}
            alt={file.name}
            className="object-contain max-h-full max-w-full"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-slate-400">
            <File size={36} className="text-primary/70" />
            <span className="text-[9px] uppercase font-bold tracking-wider">{file.name.split('.').pop()}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="w-full text-center shrink-0 min-h-[32px] flex flex-col justify-center">
        <p className="text-xs font-bold text-slate-700 truncate w-full px-1" title={file.name}>
          {file.name}
        </p>
        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
          {formatSize(file.size)}
        </p>
      </div>

      {/* Hover overlay actions */}
      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center gap-1.5 z-20">
        {isMultiple && (
          <>
            <button
              type="button"
              disabled={index === 0}
              onClick={onMoveLeft}
              className="w-8 h-8 rounded-lg bg-white/95 hover:bg-white text-slate-700 disabled:opacity-30 disabled:hover:bg-white/95 flex items-center justify-center transition-all hover:scale-105"
              title="Move Left"
            >
              <ArrowLeft size={16} />
            </button>
            <button
              type="button"
              disabled={index === totalFiles - 1}
              onClick={onMoveRight}
              className="w-8 h-8 rounded-lg bg-white/95 hover:bg-white text-slate-700 disabled:opacity-30 disabled:hover:bg-white/95 flex items-center justify-center transition-all hover:scale-105"
              title="Move Right"
            >
              <ArrowRight size={16} />
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="w-8 h-8 rounded-lg bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all hover:scale-105"
          title="Delete File"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

const ToolPage = () => {
  const { toolId } = useParams();
  const navigate = useNavigate();
  const { tools, setHasSelectedFiles } = useApp();
  
  const [tool, setTool] = useState(null);
  const [files, setFiles] = useState([]);
  const selectedFiles = files;
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successResult, setSuccessResult] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fileInputRef = useRef(null);

  const removeFile = (idxToRemove) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const moveFile = (index, direction) => {
    if (!tool?.multiple) return;
    const newFiles = [...files];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= files.length) return;
    
    // Swap
    const temp = newFiles[index];
    newFiles[index] = newFiles[targetIndex];
    newFiles[targetIndex] = temp;
    setFiles(newFiles);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileAppend = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const list = Array.from(e.target.files);
      const allowedExts = tool.accept.split(',').map(ext => ext.trim().toLowerCase());
      const filtered = list.filter(file => {
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        return allowedExts.includes(ext) || tool.accept === '*';
      });

      if (filtered.length === 0) return;

      if (tool.multiple) {
        setFiles((prev) => [...prev, ...filtered]);
      } else {
        setFiles([filtered[0]]);
      }
    }
  };


  // Tool specific configuration states
  const [password, setPassword] = useState('');
  const [splitMode, setSplitMode] = useState('all'); // 'all' or 'range'
  const [range, setRange] = useState('1-3');
  const [degrees, setDegrees] = useState('90');
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkFontSize, setWatermarkFontSize] = useState('40');
  const [watermarkOpacity, setWatermarkOpacity] = useState('0.3');
  const [watermarkColor, setWatermarkColor] = useState('#888888');

  // Image to PDF settings states
  const [paperSize, setPaperSize] = useState('A4'); // 'A4', 'Letter', 'Auto'
  const [orientation, setOrientation] = useState('Portrait'); // 'Portrait', 'Landscape'
  const [mergeMode, setMergeMode] = useState('merge'); // 'merge', 'individual'

  // PDF to Image settings states
  const [pdfToImgFormat, setPdfToImgFormat] = useState('jpg'); // 'jpg', 'png'
  const [pdfToImgDpi, setPdfToImgDpi] = useState('150'); // '300', '150', '75'
  const [pdfToImgQuality, setPdfToImgQuality] = useState('high'); // 'high', 'medium', 'low'

  // Merge settings states
  const [mergeSortOrder, setMergeSortOrder] = useState('default'); // 'default', 'alpha', 'reverse'
  const [addBlankPage, setAddBlankPage] = useState(false);
  const [compressMerged, setCompressMerged] = useState(false);

  // Document to PDF settings states
  const [officeLayoutMode, setOfficeLayoutMode] = useState('fit'); // 'fit', 'original'
  const [officeOrientation, setOfficeOrientation] = useState('auto'); // 'auto', 'portrait', 'landscape'

  // PDF to Word settings states
  const [pdfToWordMode, setPdfToWordMode] = useState('flowing'); // 'flowing', 'exact'
  const [pdfToWordOCR, setPdfToWordOCR] = useState(false);

  // PDF to Excel settings states
  const [pdfToExcelMode, setPdfToExcelMode] = useState('auto'); // 'auto', 'layout'
  const [pdfToExcelSingleSheet, setPdfToExcelSingleSheet] = useState(false);

  // PDF to PowerPoint settings states
  const [pdfToPptSize, setPdfToPptSize] = useState('16:9'); // '16:9', '4:3'
  const [pdfToPptVectorMode, setPdfToPptVectorMode] = useState(false);

  // Remove Pages / Organize PDF page order state
  // Array of 0-based page indices in the desired output order
  const [pageOrder, setPageOrder] = useState([]);

  // Page Numbers settings states
  const [numPosition, setNumPosition] = useState('bottom_center');
  const [numStartingNumber, setNumStartingNumber] = useState('1');

  // Compress PDF settings states
  const [compressionLevel, setCompressionLevel] = useState('recommended');

  useEffect(() => {
    const currentTool = tools.find(t => t.id === toolId);
    if (!currentTool) {
      navigate('/');
    } else {
      setTool(currentTool);
      setFiles([]); // Reset files on tool switch
      setErrorMsg('');
      setSuccessResult(null);
      setPaperSize('A4');
      setOrientation('Portrait');
      setMergeMode('merge');
      setPassword('');
      setSplitMode('all');
      setRange('1-3');
      setDegrees('90');
      setWatermarkText('CONFIDENTIAL');
      setWatermarkFontSize('40');
      setWatermarkOpacity('0.3');
      setWatermarkColor('#888888');
      
      // Reset new states
      setPdfToImgFormat('jpg');
      setPdfToImgDpi('150');
      setPdfToImgQuality('high');
      setMergeSortOrder('default');
      setAddBlankPage(false);
      setCompressMerged(false);
      setOfficeLayoutMode('fit');
      setOfficeOrientation('auto');
      setPdfToWordMode('flowing');
      setPdfToWordOCR(false);
      setPdfToExcelMode('auto');
      setPdfToExcelSingleSheet(false);
      setPdfToPptSize('16:9');
      setPdfToPptVectorMode(false);
      setPageOrder([]); // Reset page order on tool switch
      setNumPosition('bottom_center');
      setNumStartingNumber('1');
      setCompressionLevel('recommended');
    }
  }, [toolId, tools, navigate]);

  useEffect(() => {
    setHasSelectedFiles(files.length > 0 && !successResult);
    return () => setHasSelectedFiles(false);
  }, [files, successResult, setHasSelectedFiles]);

  if (!tool) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) return;

    setIsProcessing(true);
    setStatusText('Uploading your files...');
    setErrorMsg('');

    // Pre-process files array if needed (e.g. Merge sorting)
    let processedFiles = [...files];
    if (tool.id === 'merge') {
      if (mergeSortOrder === 'alpha') {
        processedFiles.sort((a, b) => a.name.localeCompare(b.name));
      } else if (mergeSortOrder === 'reverse') {
        processedFiles.sort((a, b) => b.name.localeCompare(a.name));
      }
    }

    const formData = new FormData();
    
    // Append tool specific fields first
    if (tool.id === 'protect' || tool.id === 'unlock') {
      formData.append('password', password);
      setStatusText(tool.id === 'protect' ? 'Encrypting PDF...' : 'Decrypting PDF...');
    } else if (tool.id === 'split') {
      formData.append('splitMode', splitMode);
      if (splitMode === 'range') {
        formData.append('range', range);
      }
      setStatusText('Splitting PDF pages...');
    } else if (tool.id === 'rotate') {
      formData.append('degrees', degrees);
      setStatusText('Rotating PDF pages...');
    } else if (tool.id === 'watermark') {
      formData.append('text', watermarkText);
      formData.append('fontSize', watermarkFontSize);
      formData.append('opacity', watermarkOpacity);
      formData.append('color', watermarkColor);
      setStatusText('Applying watermark stamp...');
    } else if (tool.id === 'pdf2jpg') {
      const settingsPayload = {
        format: pdfToImgFormat,
        dpi: pdfToImgDpi,
        quality: pdfToImgQuality === 'high' ? 92 : pdfToImgQuality === 'medium' ? 80 : 60
      };
      formData.append('settings', JSON.stringify(settingsPayload));
      setStatusText('Extracting PDF pages to images (JPG/PNG)...');
    } else if (tool.id === 'jpg2pdf') {
      const settingsPayload = {
        paperSize: paperSize,
        orientation: orientation.toLowerCase(),
        mode: processedFiles.length > 1 ? mergeMode : 'merge'
      };
      formData.append('settings', JSON.stringify(settingsPayload));
      setStatusText('Assembling images (JPG/JPEG/PNG) to PDF...');
    } else if (tool.id === 'word2pdf' || tool.id === 'excel2pdf' || tool.id === 'ppt2pdf' || tool.id === 'html2pdf') {
      const settingsPayload = {
        layoutMode: officeLayoutMode,
        orientation: officeOrientation
      };
      formData.append('settings', JSON.stringify(settingsPayload));
      setStatusText('Converting document layout to PDF...');
    } else if (tool.id === 'pdf2word') {
      const settingsPayload = {
        mode: pdfToWordMode,
        ocr: pdfToWordOCR
      };
      formData.append('settings', JSON.stringify(settingsPayload));
      setStatusText('Converting PDF layout to Word document...');
    } else if (tool.id === 'pdf2excel') {
      const settingsPayload = {
        mode: pdfToExcelMode,
        singleSheet: pdfToExcelSingleSheet
      };
      formData.append('settings', JSON.stringify(settingsPayload));
      setStatusText('Converting PDF tables to Excel spreadsheet...');
    } else if (tool.id === 'pdf2ppt') {
      const settingsPayload = {
        slideSize: pdfToPptSize,
        vectorMode: pdfToPptVectorMode
      };
      formData.append('settings', JSON.stringify(settingsPayload));
      setStatusText('Converting PDF slides to PowerPoint presentation...');
    } else if (tool.id === 'merge') {
      const settingsPayload = {
        sortOrder: mergeSortOrder,
        addBlankPage: addBlankPage,
        compress: compressMerged
      };
      formData.append('settings', JSON.stringify(settingsPayload));
      setStatusText('Merging PDF files...');
    } else if (tool.id === 'remove-pages') {
      formData.append('settings', JSON.stringify({ pageOrder }));
      setStatusText('Removing selected pages from PDF...');
    } else if (tool.id === 'organize-pdf') {
      formData.append('settings', JSON.stringify({ pageOrder }));
      setStatusText('Reordering PDF pages...');
    } else if (tool.id === 'numbers') {
      const settingsPayload = {
        position: numPosition,
        startingNumber: parseInt(numStartingNumber) || 1
      };
      formData.append('settings', JSON.stringify(settingsPayload));
      setStatusText('Adding page numbers to PDF...');
    } else if (tool.id === 'compress') {
      const settingsPayload = {
        compressionLevel: compressionLevel
      };
      formData.append('settings', JSON.stringify(settingsPayload));
      setStatusText('Compressing PDF...');
    } else if (tool.id === 'repair') {
      setStatusText('Repairing and rebuilding PDF...');
    }

    // Append files after fields
    if (tool.id === 'jpg2pdf') {
      processedFiles.forEach(file => {
        formData.append('images', file);
      });
    } else if (tool.multiple) {
      processedFiles.forEach(file => {
        formData.append('files', file);
      });
    } else {
      formData.append('file', processedFiles[0]);
    }

    try {
      const response = await api.post(tool.endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.success) {
        const downloadUrl = response.data.downloadUrl;
        const fileName = response.data.fileName;
        const size = response.data.size;

        // Show success state on the same page
        setSuccessResult({
          downloadUrl,
          fileName,
          size
        });
      } else {
        throw new Error(response.data.error || 'Server returned an error');
      }
    } catch (err) {
      console.error('Full submission error details:', err);
      const friendlyError = err.response?.data?.error || err.message || 'An error occurred during processing.';
      setErrorMsg(friendlyError);
      alert(`Processing failed: ${friendlyError}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!successResult || !successResult.downloadUrl) return;
    setIsDownloading(true);
    try {
      const backendUrl = api.defaults.baseURL
        ? (api.defaults.baseURL.endsWith('/api') ? api.defaults.baseURL.slice(0, -4) : api.defaults.baseURL)
        : '';
      
      const fileUrl = `${backendUrl}${successResult.downloadUrl}`;
      
      const response = await api.get(fileUrl, {
        responseType: 'blob',
      });
      
      const blob = response.data;
      const objectUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = objectUrl;
      link.setAttribute('download', successResult.fileName || 'forged-document.pdf');
      
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('Secure download failed:', err);
      alert('Failed to securely download the file. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const renderSettings = () => {
    switch (tool.id) {
      case 'protect':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Set PDF Password</label>
              <input
                type="password"
                placeholder="Enter password to lock document"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="block w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              />
            </div>
          </div>
        );
      case 'unlock':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Enter Password (if encrypted)</label>
              <input
                type="password"
                placeholder="Leave blank if document has no owner restriction"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              />
            </div>
          </div>
        );
      case 'split':
        return (
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Split Option</label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="splitMode"
                  value="all"
                  checked={splitMode === 'all'}
                  onChange={() => setSplitMode('all')}
                  className="text-primary cursor-pointer"
                />
                Extract all pages (ZIP)
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="splitMode"
                  value="range"
                  checked={splitMode === 'range'}
                  onChange={() => setSplitMode('range')}
                  className="text-primary cursor-pointer"
                />
                Custom range
              </label>
            </div>

            {splitMode === 'range' && (
              <div className="pt-2 animate-float duration-200">
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Page Ranges (e.g. 1-3, 5)</label>
                <input
                  type="text"
                  placeholder="Example: 1-5 or 2, 4-7"
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                  className="block w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
              </div>
            )}
          </div>
        );
      case 'rotate':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Rotation Angle</label>
              <select
                value={degrees}
                onChange={(e) => setDegrees(e.target.value)}
                className="block w-full p-3 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm cursor-pointer"
              >
                <option value="90">90° Clockwise</option>
                <option value="180">180° Half rotation</option>
                <option value="270">270° Counter-clockwise</option>
              </select>
            </div>
          </div>
        );
      case 'watermark':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Watermark Text</label>
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                className="block w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Text Color</label>
              <input
                type="color"
                value={watermarkColor}
                onChange={(e) => setWatermarkColor(e.target.value)}
                className="block w-full h-[42px] p-1 border border-slate-200 rounded-xl cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Font Size ({watermarkFontSize}px)</label>
              <input
                type="range"
                min="16"
                max="80"
                value={watermarkFontSize}
                onChange={(e) => setWatermarkFontSize(e.target.value)}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Opacity ({Math.round(watermarkOpacity * 100)}%)</label>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={watermarkOpacity}
                onChange={(e) => setWatermarkOpacity(e.target.value)}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>
        );
      case 'jpg2pdf':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2">Paper Size</label>
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value)}
                className="block w-full p-3 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm cursor-pointer"
              >
                <option value="A4">A4 (210 x 297 mm)</option>
                <option value="Letter">US Letter (8.5 x 11 in)</option>
                <option value="Auto">Auto (Same size as image)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2">Page Orientation</label>
              <div className="flex gap-4 p-2 bg-white border border-slate-200 rounded-xl h-[46px] items-center">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="orientation"
                    value="Portrait"
                    checked={orientation === 'Portrait'}
                    onChange={() => setOrientation('Portrait')}
                    disabled={paperSize === 'Auto'}
                    className="text-primary disabled:opacity-50 cursor-pointer"
                  />
                  <span className={paperSize === 'Auto' ? 'text-slate-400' : ''}>Portrait</span>
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="orientation"
                    value="Landscape"
                    checked={orientation === 'Landscape'}
                    onChange={() => setOrientation('Landscape')}
                    disabled={paperSize === 'Auto'}
                    className="text-primary disabled:opacity-50 cursor-pointer"
                  />
                  <span className={paperSize === 'Auto' ? 'text-slate-400' : ''}>Landscape</span>
                </label>
              </div>
            </div>

            {files.length > 1 && (
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={mergeMode === 'merge'}
                    onChange={(e) => setMergeMode(e.target.checked ? 'merge' : 'individual')}
                    className="w-4.5 h-4.5 text-primary border-slate-300 rounded focus:ring-primary/20 accent-primary cursor-pointer"
                  />
                  <span className="text-slate-700 select-none">Merge all images in one PDF file</span>
                </label>
              </div>
            )}
          </div>
        );
      case 'pdf2jpg':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2">Image Format</label>
              <select
                value={pdfToImgFormat}
                onChange={(e) => setPdfToImgFormat(e.target.value)}
                className="block w-full p-3 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm cursor-pointer"
              >
                <option value="jpg">JPG (High Compatibility)</option>
                <option value="png">PNG (Lossless Quality)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2">Resolution (DPI)</label>
              <select
                value={pdfToImgDpi}
                onChange={(e) => setPdfToImgDpi(e.target.value)}
                className="block w-full p-3 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm cursor-pointer"
              >
                <option value="150">150 DPI (Standard Quality)</option>
                <option value="300">300 DPI (High Resolution)</option>
                <option value="75">75 DPI (Compact Size)</option>
              </select>
            </div>
            {pdfToImgFormat === 'jpg' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2">Quality</label>
                <select
                  value={pdfToImgQuality}
                  onChange={(e) => setPdfToImgQuality(e.target.value)}
                  className="block w-full p-3 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm cursor-pointer"
                >
                  <option value="high">High Quality (Optimal)</option>
                  <option value="medium">Medium Quality (Balanced)</option>
                  <option value="low">Low Quality (Minimal size)</option>
                </select>
              </div>
            )}
          </div>
        );
      case 'merge':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2">File Sorting Order</label>
              <select
                value={mergeSortOrder}
                onChange={(e) => setMergeSortOrder(e.target.value)}
                className="block w-full p-3 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm cursor-pointer"
              >
                <option value="default">Upload Order (Manual)</option>
                <option value="alpha">Alphabetical (A-Z)</option>
                <option value="reverse">Reverse Alphabetical (Z-A)</option>
              </select>
            </div>
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={compressMerged}
                  onChange={(e) => setCompressMerged(e.target.checked)}
                  className="w-4.5 h-4.5 text-primary border-slate-300 rounded focus:ring-primary/20 accent-primary cursor-pointer"
                />
                <span className="text-slate-700 select-none">Optimize & compress PDF size</span>
              </label>
              <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={addBlankPage}
                  onChange={(e) => setAddBlankPage(e.target.checked)}
                  className="w-4.5 h-4.5 text-primary border-slate-300 rounded focus:ring-primary/20 accent-primary cursor-pointer"
                />
                <span className="text-slate-700 select-none">Add blank page for double-sided printing</span>
              </label>
            </div>
          </div>
        );
      case 'word2pdf':
      case 'excel2pdf':
      case 'ppt2pdf':
      case 'html2pdf':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2">Conversion Layout</label>
              <select
                value={officeLayoutMode}
                onChange={(e) => setOfficeLayoutMode(e.target.value)}
                className="block w-full p-3 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm cursor-pointer"
              >
                <option value="fit">Fit to Page (Auto margin)</option>
                <option value="original">Original Dimensions</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2">Orientation Mode</label>
              <select
                value={officeOrientation}
                onChange={(e) => setOfficeOrientation(e.target.value)}
                className="block w-full p-3 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm cursor-pointer"
              >
                <option value="auto">Auto-detect from source</option>
                <option value="portrait">Force Portrait</option>
                <option value="landscape">Force Landscape</option>
              </select>
            </div>
          </div>
        );
      case 'pdf2word':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2">Document Layout reconstruction</label>
              <select
                value={pdfToWordMode}
                onChange={(e) => setPdfToWordMode(e.target.value)}
                className="block w-full p-3 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm cursor-pointer"
              >
                <option value="flowing">Flowing Text (Highly editable)</option>
                <option value="exact">Strict Layout (Preserves coordinates)</option>
              </select>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={pdfToWordOCR}
                  onChange={(e) => setPdfToWordOCR(e.target.checked)}
                  className="w-4.5 h-4.5 text-primary border-slate-300 rounded focus:ring-primary/20 accent-primary cursor-pointer"
                />
                <span className="text-slate-700 select-none">Perform OCR text extraction on scanned pages</span>
              </label>
            </div>
          </div>
        );
      case 'pdf2excel':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2">Table Extraction Strategy</label>
              <select
                value={pdfToExcelMode}
                onChange={(e) => setPdfToExcelMode(e.target.value)}
                className="block w-full p-3 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm cursor-pointer"
              >
                <option value="auto">Auto detect structure (Recommended)</option>
                <option value="layout">Strict grid layout parsing</option>
              </select>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={pdfToExcelSingleSheet}
                  onChange={(e) => setPdfToExcelSingleSheet(e.target.checked)}
                  className="w-4.5 h-4.5 text-primary border-slate-300 rounded focus:ring-primary/20 accent-primary cursor-pointer"
                />
                <span className="text-slate-700 select-none">Consolidate all extracted tables to single sheet</span>
              </label>
            </div>
          </div>
        );
      case 'pdf2ppt':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2">Slide Dimension Aspect Ratio</label>
              <select
                value={pdfToPptSize}
                onChange={(e) => setPdfToPptSize(e.target.value)}
                className="block w-full p-3 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm cursor-pointer"
              >
                <option value="16:9">Widescreen 16:9 layout</option>
                <option value="4:3">Standard 4:3 layout</option>
              </select>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={pdfToPptVectorMode}
                  onChange={(e) => setPdfToPptVectorMode(e.target.checked)}
                  className="w-4.5 h-4.5 text-primary border-slate-300 rounded focus:ring-primary/20 accent-primary cursor-pointer"
                />
                <span className="text-slate-700 select-none">Render graphics as editable vector assets</span>
              </label>
            </div>
          </div>
        );
      case 'remove-pages':
      case 'organize-pdf':
      case 'repair':
        return null;
      case 'compress':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Compression Level</label>
              <select
                value={compressionLevel}
                onChange={(e) => setCompressionLevel(e.target.value)}
                className="block w-full p-3 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm cursor-pointer"
              >
                <option value="recommended">Recommended (Good quality, good compression)</option>
                <option value="extreme">Extreme (Less quality, high compression)</option>
                <option value="less">Less (High quality, less compression)</option>
              </select>
            </div>
          </div>
        );
      case 'numbers':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Page Numbers Position</label>
              <select
                value={numPosition}
                onChange={(e) => setNumPosition(e.target.value)}
                className="block w-full p-3 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm cursor-pointer"
              >
                <option value="bottom_center">Bottom Center</option>
                <option value="bottom_left">Bottom Left</option>
                <option value="bottom_right">Bottom Right</option>
                <option value="top_center">Top Center</option>
                <option value="top_left">Top Left</option>
                <option value="top_right">Top Right</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Starting Page Number</label>
              <input
                type="number"
                min="1"
                value={numStartingNumber}
                onChange={(e) => setNumStartingNumber(e.target.value)}
                required
                className="block w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const hasFiles = files.length > 0;
  // Determine if this is a page-manipulation tool that renders PDFPageGrid
  const isPageTool = tool.id === 'remove-pages' || tool.id === 'organize-pdf';
  const showDesktopSplit = isLargeScreen && hasFiles && !successResult;

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${showDesktopSplit ? 'py-2 lg:h-[calc(100vh-90px)] lg:overflow-hidden flex flex-col' : 'py-8'}`}>
      {/* Back to Home */}
      <div className={`flex items-center justify-between mb-4 shrink-0`}>
        <Link to="/" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 font-semibold text-xs uppercase tracking-wider">
          <ArrowLeft size={16} /> Back to Tools
        </Link>
        <div className="text-slate-400 text-xs font-semibold">100% Secure & Clean</div>
      </div>

      {/* Workspace Container */}
      <div className={`${showDesktopSplit ? 'max-w-7xl lg:flex-grow lg:min-h-0 lg:my-2 w-full' : 'max-w-3xl my-8'} mx-auto`}>
        <div className={`bg-white border border-slate-200/80 rounded-3xl shadow-premium ${showDesktopSplit ? 'p-0 lg:h-full overflow-hidden' : 'p-6 md:p-8'}`}>
          
          {successResult ? (
            <div className="flex flex-col items-center text-center py-6 p-6 md:p-8">
              {/* Success Badge */}
              <div className="w-20 h-20 rounded-full bg-green-50 text-green-500 border border-green-200 flex items-center justify-center mb-6 shadow-sm">
                <FileCheck size={40} />
              </div>

              <h2 className="text-2xl md:text-3xl font-black text-slate-900">
                Your file is ready!
              </h2>
              <p className="text-slate-500 text-xs md:text-sm mt-2 max-w-md leading-relaxed">
                The operation completed successfully. Click the button below to download your file.
              </p>

              <div className="w-full max-w-md bg-slate-50 border border-slate-100 rounded-2xl p-4 my-6 text-left">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">File Details</p>
                <p className="font-bold text-slate-800 text-sm mt-1 truncate" title={successResult.fileName}>
                  {successResult.fileName}
                </p>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  File Size: {formatSize(successResult.size)}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="flex-grow py-3 bg-accent text-white hover:bg-accent-dark rounded-xl font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent/20 cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDownloading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download size={16} /> Download Your File
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFiles([]);
                    setSuccessResult(null);
                    setPassword('');
                    setPaperSize('A4');
                    setOrientation('Portrait');
                    setMergeMode('merge');
                    setPageOrder([]);
                    setNumPosition('bottom_center');
                    setNumStartingNumber('1');
                    setCompressionLevel('recommended');
                  }}
                  className="flex-grow py-3 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw size={14} /> Convert Another
                </button>
              </div>
            </div>
          ) : (
            <>
              {showDesktopSplit ? (
                /* DESKTOP SPLIT VIEW (Large screen only, when files selected) */
                <form onSubmit={handleSubmit} className="w-full lg:h-full flex flex-col">
                  {/* File selection hidden input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept={tool.accept}
                    multiple={tool.multiple}
                    onChange={handleFileAppend}
                  />

                  <div className="flex flex-col lg:flex-row items-stretch lg:h-full w-full min-h-0">
                    <div className="flex-1 bg-gray-50 p-6 overflow-y-auto lg:h-full relative flex flex-col min-h-0">
                      {tool.multiple && !isPageTool && (
                        <div className="sticky top-0 z-30 flex justify-end pointer-events-none mb-[-48px]">
                          <button
                            type="button"
                            onClick={triggerFileInput}
                            className="pointer-events-auto w-12 h-12 rounded-full bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
                            title="Add More Files"
                          >
                            <Plus size={24} className="stroke-[3]" />
                          </button>
                        </div>
                      )}

                      <div className="flex justify-between items-center mb-6 pr-14 shrink-0">
                        <h3 className="font-black text-slate-800 text-base md:text-lg">
                          {isPageTool ? tool.name : `Selected Files (${files.length})`}
                        </h3>
                      </div>

                      {errorMsg && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-start gap-2 shrink-0">
                          <ShieldAlert size={20} className="shrink-0 mt-0.5 text-red-500" />
                          <div>
                            <p className="font-bold">Process Failed</p>
                            <p className="text-xs text-red-600 mt-1">{errorMsg}</p>
                          </div>
                        </div>
                      )}

                      {isPageTool ? (
                        <PDFPageGrid
                          pdfFile={files[0]}
                          mode={tool.id === 'remove-pages' ? 'remove' : 'organize'}
                          onPagesChange={setPageOrder}
                        />
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-x-3 gap-y-4 p-1 justify-items-center flex-grow overflow-y-auto">
                          {files.map((file, idx) => (
                            <FilePreviewCard
                              key={`${file.name}-${idx}`}
                              file={file}
                              index={idx}
                              totalFiles={files.length}
                              onRemove={() => removeFile(idx)}
                              onMoveLeft={() => moveFile(idx, -1)}
                              onMoveRight={() => moveFile(idx, 1)}
                              isMultiple={tool.multiple}
                              formatSize={formatSize}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="w-full lg:w-96 bg-white p-6 border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col justify-between lg:h-full shrink-0 min-h-0">
                      <div className="space-y-6 overflow-y-auto pb-6 flex-grow min-h-0">
                        <div>
                          <h3 className="text-xl font-black text-slate-900 leading-tight">{tool.name}</h3>
                          <p className="text-slate-500 text-xs mt-2 leading-relaxed">{tool.desc}</p>
                          <div className="h-px bg-slate-100 my-4" />
                        </div>

                        {/* Tool parameters settings blocks */}
                        {renderSettings() && (
                          <div className="space-y-4">
                            <h4 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">
                              Configure Settings
                            </h4>
                            {renderSettings()}
                          </div>
                        )}
                      </div>

                      {/* Process button - Pinned/Sticky at Bottom */}
                      <div className="pt-4 border-t border-slate-100 shrink-0 bg-white">
                        <button
                          type="submit"
                          disabled={files.length === 0 || (isPageTool && pageOrder.length === 0)}
                          className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer ${
                            files.length > 0 && (!isPageTool || pageOrder.length > 0)
                              ? 'bg-primary text-white hover:bg-primary-dark shadow-primary/20 hover:scale-[1.01]'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                          }`}
                        >
                          <Check size={16} /> Process Document
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              ) : (
                /* MOBILE VIEW & STANDARD VIEW BEFORE UPLOAD (Identical to original sequential structure) */
                <>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900">{tool.name}</h2>
                    <p className="text-slate-500 text-xs md:text-sm mt-2 max-w-lg mx-auto leading-relaxed">{tool.desc}</p>
                  </div>

                  {errorMsg && !hasFiles && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-start gap-2">
                      <ShieldAlert size={20} className="shrink-0 mt-0.5 text-red-500" />
                      <div>
                        <p className="font-bold">Process Failed</p>
                        <p className="text-xs text-red-600 mt-1">{errorMsg}</p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <DragDropZone
                      accept={tool.accept}
                      multiple={tool.multiple}
                      files={files}
                      setFiles={setFiles}
                    />

                    {/* Tool specific parameters form panels */}
                    {/* Tool specific parameters form panels */}
                    {hasFiles && renderSettings() && (
                      <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-4 text-left">
                        <h3 className="font-bold text-slate-800 text-sm border-b border-slate-200 pb-2">
                          Configure Settings
                        </h3>
                        {renderSettings()}
                      </div>
                    )}

                    <button
                      type="submit"
                      onClick={handleSubmit}
                      disabled={files.length === 0 || (isPageTool && pageOrder.length === 0)}
                      className={`relative z-10 w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer ${
                        files.length > 0 && (!isPageTool || pageOrder.length > 0)
                          ? 'bg-primary text-white hover:bg-primary-dark shadow-primary/20 hover:scale-[1.01]'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                      }`}
                    >
                      <Check size={16} /> Process Document
                    </button>
                  </form>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <ProcessingOverlay isVisible={isProcessing} statusText={statusText} />
    </div>
  );
};

export default ToolPage;
