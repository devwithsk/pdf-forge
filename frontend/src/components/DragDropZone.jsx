import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, File, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

// Renders a single file row — shows an image thumbnail when the file is an image,
// or a generic icon otherwise. Cleans up the object URL on unmount.
//
// IMPORTANT: The useEffect dependency array is intentionally empty ([]).
// File objects are compared by reference — if the parent re-renders and passes
// a new reference to the same underlying file, using [file] would revoke the
// existing URL and immediately create a new one, causing a race condition on
// mobile WebKit where the <img> src is invalidated before it finishes loading.
// Since a File object never mutates, running this once on mount is correct.
const FileRow = ({ file, idx, totalFiles, multiple, onRemove, onMoveUp, onMoveDown, formatSize }) => {
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

  const showThumbnail = previewUrl && !imgError;

  return (
    <div className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-100 rounded-xl group hover:border-slate-200 hover:bg-white transition-all">
      {/* Thumbnail / Icon */}
      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-primary/5 border border-slate-100 flex items-center justify-center">
        {showThumbnail ? (
          <img
            src={previewUrl}
            alt={file.name}
            className="w-full h-full object-cover"
            draggable={false}
            onError={() => setImgError(true)}
          />
        ) : (
          <File size={20} className="text-primary/70" />
        )}
      </div>

      {/* Name & size */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate leading-tight" title={file.name}>
          {file.name}
        </p>
        <p className="text-xs text-slate-400 mt-0.5 font-medium">{formatSize(file.size)}</p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-0.5 shrink-0">
        {multiple && (
          <>
            <button
              type="button"
              disabled={idx === 0}
              onClick={() => onMoveUp(idx)}
              className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
              title="Move up"
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              disabled={idx === totalFiles - 1}
              onClick={() => onMoveDown(idx)}
              className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
              title="Move down"
            >
              <ArrowDown size={14} />
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => onRemove(idx)}
          className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors ml-0.5"
          title="Remove file"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
};

const DragDropZone = ({ accept, multiple, files, setFiles }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const processFiles = (newFilesList) => {
    const list = Array.from(newFilesList);
    
    // Extensions verification
    const allowedExts = accept.split(',').map(ext => ext.trim().toLowerCase());
    const filtered = list.filter(file => {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      return allowedExts.includes(ext) || accept === '*';
    });

    if (filtered.length === 0) return;

    if (multiple) {
      setFiles((prev) => [...prev, ...filtered]);
    } else {
      setFiles([filtered[0]]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removeFile = (idxToRemove) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const moveFile = (index, direction) => {
    if (!multiple) return;
    const newFiles = [...files];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= files.length) return;
    
    // Swap
    const temp = newFiles[index];
    newFiles[index] = newFiles[targetIndex];
    newFiles[targetIndex] = temp;
    setFiles(newFiles);
  };

  const openFileDialog = () => {
    fileInputRef.current.click();
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={files.length === 0 ? openFileDialog : undefined}
        className={`w-full border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[280px] ${
          isDragActive 
            ? 'border-primary bg-primary/5 scale-[1.01]' 
            : 'border-slate-300 bg-white hover:border-primary/50'
        } ${files.length > 0 ? 'cursor-default' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
        />

        {files.length === 0 ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <UploadCloud size={32} />
            </div>
            <div>
              <p className="text-slate-800 font-bold text-lg md:text-xl">
                Drag & Drop files here
              </p>
              <p className="text-slate-400 text-sm mt-1">
                or click to browse from device ({accept})
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openFileDialog();
              }}
              className="mt-2 bg-primary text-white hover:bg-primary-dark font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-md shadow-primary/20 hover:scale-[1.02]"
            >
              Select Files
            </button>
          </div>
        ) : (
          <div className="w-full text-left">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-3">
              <h4 className="font-bold text-slate-800 text-base">
                Selected Files ({files.length})
              </h4>
              <button
                type="button"
                onClick={openFileDialog}
                className="text-xs text-primary font-bold hover:underline"
              >
                + Add More
              </button>
            </div>

            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-0.5">
              {files.map((file, idx) => (
                <FileRow
                  key={`${file.name}-${idx}`}
                  file={file}
                  idx={idx}
                  totalFiles={files.length}
                  multiple={multiple}
                  onRemove={removeFile}
                  onMoveUp={(i) => moveFile(i, -1)}
                  onMoveDown={(i) => moveFile(i, 1)}
                  formatSize={formatSize}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DragDropZone;
