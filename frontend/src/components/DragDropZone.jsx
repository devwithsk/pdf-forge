import React, { useRef, useState } from 'react';
import { UploadCloud, File, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

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
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
              <h4 className="font-bold text-slate-800 text-base">
                Selected Files ({files.length})
              </h4>
              <button
                type="button"
                onClick={openFileDialog}
                className="text-xs text-primary font-bold hover:underline"
              >
                + Add More Files
              </button>
            </div>

            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {files.map((file, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl group hover:border-slate-200 transition-all"
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <File size={16} />
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-semibold text-slate-800 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatSize(file.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {multiple && (
                      <>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveFile(idx, -1)}
                          className="p-1.5 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Move up"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === files.length - 1}
                          onClick={() => moveFile(idx, 1)}
                          className="p-1.5 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Move down"
                        >
                          <ArrowDown size={14} />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors ml-1"
                      title="Remove file"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DragDropZone;
