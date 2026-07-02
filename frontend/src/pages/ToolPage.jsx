import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import DragDropZone from '../components/DragDropZone';
import ProcessingOverlay from '../components/ProcessingOverlay';
import AdBanner from '../components/AdBanner';
import api from '../utils/api';
import { ArrowLeft, Check, ShieldAlert, Download, RefreshCw, FileCheck } from 'lucide-react';

const ToolPage = () => {
  const { toolId } = useParams();
  const navigate = useNavigate();
  const { tools } = useApp();
  
  const [tool, setTool] = useState(null);
  const [files, setFiles] = useState([]);
  const selectedFiles = files;
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successResult, setSuccessResult] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);


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
    }
  }, [toolId, tools, navigate]);

  if (!tool) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) return;

    setIsProcessing(true);
    setStatusText('Uploading your files...');
    setErrorMsg('');

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
      setStatusText('Extracting PDF pages to images (JPG/PNG)...');
    } else if (tool.id === 'jpg2pdf') {
      const settingsPayload = {
        paperSize: paperSize,
        orientation: orientation.toLowerCase(),
        mode: files.length > 1 ? mergeMode : 'merge'
      };
      formData.append('settings', JSON.stringify(settingsPayload));
      setStatusText('Assembling images (JPG/JPEG/PNG) to PDF...');
    } else if (tool.id === 'word2pdf' || tool.id === 'excel2pdf' || tool.id === 'ppt2pdf' || tool.id === 'html2pdf') {
      setStatusText('Converting document layout to PDF...');
    } else if (tool.id === 'pdf2word') {
      setStatusText('Converting PDF layout to Word document...');
    } else if (tool.id === 'pdf2excel') {
      setStatusText('Converting PDF tables to Excel spreadsheet...');
    } else if (tool.id === 'pdf2ppt') {
      setStatusText('Converting PDF slides to PowerPoint presentation...');
    }

    // Append files after fields
    if (tool.id === 'jpg2pdf') {
      files.forEach(file => {
        formData.append('images', file);
      });
    } else if (tool.multiple) {
      files.forEach(file => {
        formData.append('files', file);
      });
    } else {
      formData.append('file', files[0]);
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
      console.error(err);
      setErrorMsg(err.response?.data?.error || err.message || 'An error occurred during processing.');
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

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back to Home */}
      <div className="flex items-center justify-between mb-6">
        <Link to="/" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 font-semibold text-xs uppercase tracking-wider">
          <ArrowLeft size={16} /> Back to Tools
        </Link>
        <div className="text-slate-400 text-xs font-semibold">100% Secure & Clean</div>
      </div>

      {/* Centered Workspace Container */}
      <div className="max-w-3xl mx-auto my-8">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-premium">
          
          {successResult ? (
            <div className="flex flex-col items-center text-center py-6">
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
                  }}
                  className="flex-grow py-3 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw size={14} /> Convert Another
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-black text-slate-900">{tool.name}</h2>
                <p className="text-slate-500 text-xs md:text-sm mt-2 max-w-lg mx-auto leading-relaxed">{tool.desc}</p>
              </div>

              {errorMsg && (
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
                {files.length > 0 && (
                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                    <h3 className="font-bold text-slate-800 text-sm border-b border-slate-200 pb-2">
                      Configure Settings
                    </h3>

                    {/* Protect / Encrypt tool parameters */}
                    {tool.id === 'protect' && (
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
                    )}

                    {/* Unlock / Decrypt tool parameters */}
                    {tool.id === 'unlock' && (
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
                    )}

                    {/* Split tool parameters */}
                    {tool.id === 'split' && (
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Split Option</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="radio"
                              name="splitMode"
                              value="all"
                              checked={splitMode === 'all'}
                              onChange={() => setSplitMode('all')}
                              className="text-primary"
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
                              className="text-primary"
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
                    )}

                    {/* Rotate tool parameters */}
                    {tool.id === 'rotate' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Rotation Angle</label>
                        <select
                          value={degrees}
                          onChange={(e) => setDegrees(e.target.value)}
                          className="block w-full p-3 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                        >
                          <option value="90">90° Clockwise</option>
                          <option value="180">180° Half rotation</option>
                          <option value="270">270° Counter-clockwise</option>
                        </select>
                      </div>
                    )}

                    {/* Watermark tool parameters */}
                    {tool.id === 'watermark' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    )}

                    {/* Image to PDF settings */}
                    {tool.id === 'jpg2pdf' && (
                      <div className="space-y-4 pt-4 border-t border-slate-200/60">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2">
                              Paper Size
                            </label>
                            <select
                              value={paperSize}
                              onChange={(e) => setPaperSize(e.target.value)}
                              className="block w-full p-3 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                            >
                              <option value="A4">A4 (Portrait: 210 x 297 mm)</option>
                              <option value="Letter">US Letter (Portrait: 8.5 x 11 in)</option>
                              <option value="Auto">Auto (Same size as original image)</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2">
                              Page Orientation
                            </label>
                            <div className="flex gap-4 p-2 bg-white border border-slate-200 rounded-xl h-[46px] items-center">
                              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                                <input
                                  type="radio"
                                  name="orientation"
                                  value="Portrait"
                                  checked={orientation === 'Portrait'}
                                  onChange={() => setOrientation('Portrait')}
                                  disabled={paperSize === 'Auto'}
                                  className="text-primary disabled:opacity-50"
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
                                  className="text-primary disabled:opacity-50"
                                />
                                <span className={paperSize === 'Auto' ? 'text-slate-400' : ''}>Landscape</span>
                              </label>
                            </div>
                            {paperSize === 'Auto' && (
                              <p className="text-[10px] text-slate-400 mt-1 font-semibold">Orientation is locked in Auto size mode</p>
                            )}
                          </div>
                        </div>

                        {selectedFiles.length > 1 && (
                          <div className="radio-group">
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2">
                              Conversion Method
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <label className={`flex flex-col p-4 border rounded-2xl cursor-pointer transition-all duration-200 ${
                                mergeMode === 'merge'
                                  ? 'border-primary bg-primary/5 text-primary'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              }`}>
                                <div className="flex items-center gap-2 font-bold text-sm">
                                  <input
                                    type="radio"
                                    name="mergeMode"
                                    value="merge"
                                    checked={mergeMode === 'merge'}
                                    onChange={() => setMergeMode('merge')}
                                    className="text-primary"
                                  />
                                  Merge into single PDF
                                </div>
                                <span className="text-[11px] text-slate-400 mt-1 font-medium pl-5">
                                  Combine all images in sequential order into a multi-page document.
                                </span>
                              </label>

                              <label className={`flex flex-col p-4 border rounded-2xl cursor-pointer transition-all duration-200 ${
                                mergeMode === 'individual'
                                  ? 'border-primary bg-primary/5 text-primary'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              }`}>
                                <div className="flex items-center gap-2 font-bold text-sm">
                                  <input
                                    type="radio"
                                    name="mergeMode"
                                    value="individual"
                                    checked={mergeMode === 'individual'}
                                    onChange={() => setMergeMode('individual')}
                                    className="text-primary"
                                  />
                                  Convert to individual PDFs (ZIP)
                                </div>
                                <span className="text-[11px] text-slate-400 mt-1 font-medium pl-5">
                                  Convert each image to a separate PDF file, packaged in a single ZIP archive.
                                </span>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={files.length === 0}
                  className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md ${
                    files.length > 0
                      ? 'bg-primary text-white hover:bg-primary-dark shadow-primary/20 hover:scale-[1.01] cursor-pointer'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  <Check size={16} /> Process Document
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <ProcessingOverlay isVisible={isProcessing} statusText={statusText} />
    </div>
  );
};

export default ToolPage;
