import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { 
  Send, 
  UploadCloud, 
  FileText, 
  Brain, 
  Sparkles, 
  MessageSquare, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Trash2, 
  Bot 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const AiHub = () => {
  const { user } = useAuth();
  
  // States
  const [activeTab, setActiveTab] = useState('chat-pdf'); // 'chat-pdf' or 'ai-extractor'
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [activeDocument, setActiveDocument] = useState(''); // Selected document name
  
  // Chat States
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: "Hello! Upload a PDF on the left, and I will analyze it. You can then ask questions based on its content.",
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null); // { type: 'success' | 'error', text: string }
  
  // Extractor States
  const [extractedData, setExtractedData] = useState(null);
  const [extracting, setExtracting] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load uploaded files from session storage if exists
  useEffect(() => {
    const saved = sessionStorage.getItem('rag_uploaded_files');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUploadedFiles(parsed);
        if (parsed.length > 0) {
          setActiveDocument(parsed[0].name);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Save uploaded files to session storage
  const saveFilesToStorage = (files) => {
    setUploadedFiles(files);
    sessionStorage.setItem('rag_uploaded_files', JSON.stringify(files));
  };

  // Handle file select
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setStatusMsg(null);
    } else {
      setStatusMsg({ type: 'error', text: 'Please select a valid PDF file.' });
    }
  };

  // Handle File Upload to vector store
  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    setStatusMsg(null);
    
    const formData = new FormData();
    formData.append('email', user?.email);
    formData.append('file', selectedFile);
    
    try {
      const baseUrl = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
      const response = await api.post(`${baseUrl}/api/ai/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data && response.data.success) {
        const newFile = {
          name: selectedFile.name,
          chunksCount: response.data.chunks_count,
          uploadedAt: new Date().toLocaleTimeString()
        };
        
        const updatedList = [newFile, ...uploadedFiles.filter(f => f.name !== newFile.name)];
        saveFilesToStorage(updatedList);
        setActiveDocument(newFile.name);
        setSelectedFile(null);
        setStatusMsg({ type: 'success', text: `Successfully indexed '${newFile.name}' into vector database!` });
        
        // Add message in chat indicating file is processed
        setMessages(prev => [
          ...prev,
          {
            sender: 'assistant',
            text: `I have successfully parsed and indexed '${newFile.name}' (${newFile.chunksCount} text segments). You can now ask questions about this document!`
          }
        ]);
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({ 
        type: 'error', 
        text: err.response?.data?.detail || 'Failed to process document. Please try again.' 
      });
    } finally {
      setUploading(false);
    }
  };

  // Delete file from workspace list
  const handleDeleteFile = (fileName) => {
    const updated = uploadedFiles.filter(f => f.name !== fileName);
    saveFilesToStorage(updated);
    if (activeDocument === fileName) {
      setActiveDocument(updated[0]?.name || '');
    }
  };

  // Send RAG chat message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeDocument) return;
    
    const userMsg = inputMessage;
    setInputMessage('');
    setSending(true);
    
    // Add user message to UI
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    
    try {
      const baseUrl = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
      const response = await api.post(`${baseUrl}/api/ai/chat`, {
        prompt: userMsg,
        email: user?.email,
        document_name: activeDocument
      });
      
      if (response.data && response.data.success) {
        setMessages(prev => [
          ...prev, 
          { 
            sender: 'assistant', 
            text: response.data.answer,
            retrievedChunks: response.data.retrieved_chunks
          }
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev, 
        { 
          sender: 'assistant', 
          text: 'Oops! Something went wrong while getting the answer. Please verify connection to the AI engine.' 
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  // Mock Extractor handler
  const handleExtract = async () => {
    if (!activeDocument) return;
    setExtracting(true);
    try {
      // For now we simulate data extraction from active document
      await new Promise(resolve => setTimeout(resolve, 2000));
      setExtractedData({
        title: activeDocument.replace('.pdf', ''),
        metadata: {
          author: "Unknown/Detected from text",
          pages: 12,
          language: "English"
        },
        entities: [
          { name: "Doc Type", value: "Contract/Technical Guide" },
          { name: "Key Topics", value: "RAG, Vector Database, LLMs, Vector Embeddings" }
        ],
        summary: "This document contains detailed information regarding setup steps, configuration specifications, and code architectures for implementing AI features."
      });
    } catch (e) {
      console.error(e);
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Back button and page header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>AI Workspace</span>
              <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold uppercase flex items-center gap-0.5">
                <Sparkles size={10} className="animate-spin-slow" />
                RAG Engine
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Upload PDF files to parse them into vectors and chat directly with your document contents.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200/40 w-full md:w-auto shrink-0 shadow-inner">
          <button
            onClick={() => {
              setActiveTab('chat-pdf');
              setExtractedData(null);
            }}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
              activeTab === 'chat-pdf' 
                ? 'bg-white dark:bg-slate-905 text-primary shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Brain size={14} />
            <span>Chat with PDF</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('ai-extractor');
              setExtractedData(null);
            }}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
              activeTab === 'ai-extractor' 
                ? 'bg-white dark:bg-slate-905 text-primary shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Sparkles size={14} />
            <span>AI Data Extractor</span>
          </button>
        </div>
      </div>

      {/* Main split layout workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch min-h-[600px]">
        
        {/* Left Side: Document Manager */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* File Upload card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-premium dark:shadow-none rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <UploadCloud size={16} className="text-primary" />
              <span>Index Document</span>
            </h3>
            
            {/* Drag drop slot */}
            <div className="border-2 border-dashed border-slate-205 dark:border-slate-800 hover:border-primary/50 dark:hover:border-primary/50 rounded-xl p-6 text-center cursor-pointer transition-colors relative group">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <UploadCloud size={32} className="mx-auto text-slate-400 group-hover:text-primary transition-colors mb-2" />
              {selectedFile ? (
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-full px-2">
                    {selectedFile.name}
                  </p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Click or drag PDF here
                  </p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">
                    Maximum file size: 15MB
                  </p>
                </div>
              )}
            </div>

            {statusMsg && (
              <div className={`p-3 rounded-xl border text-xs font-bold flex items-start gap-2 ${
                statusMsg.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/30' 
                  : 'bg-red-50 border-red-100 text-red-600 dark:bg-red-950/20 dark:border-red-900/30'
              }`}>
                {statusMsg.type === 'success' ? <CheckCircle2 size={15} className="shrink-0 mt-0.5" /> : <AlertCircle size={15} className="shrink-0 mt-0.5" />}
                <span>{statusMsg.text}</span>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full bg-primary hover:bg-primary-dark disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-bold text-xs rounded-xl py-3 flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              {uploading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Processing Embeddings...</span>
                </>
              ) : (
                <>
                  <span>Upload & Index PDF</span>
                </>
              )}
            </button>
          </div>

          {/* Uploaded Documents List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-premium dark:shadow-none rounded-2xl p-6 flex flex-col flex-grow min-h-[220px]">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              <span>Workspace Library ({uploadedFiles.length})</span>
            </h3>

            {uploadedFiles.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-slate-400">
                <FileText size={32} className="mb-2 opacity-50" />
                <p className="text-xs font-semibold">No indexed documents yet.</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Upload a PDF to begin chatting.</p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1">
                {uploadedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setActiveDocument(file.name);
                      setExtractedData(null);
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      activeDocument === file.name
                        ? 'border-primary/30 bg-primary/5 dark:bg-primary/10'
                        : 'border-slate-150 hover:border-slate-200 dark:border-slate-800 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText size={16} className={activeDocument === file.name ? 'text-primary' : 'text-slate-400'} />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate pr-2">
                          {file.name}
                        </p>
                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                          {file.chunksCount} chunks indexed
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFile(file.name);
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Interactive Action Workspace */}
        <div className="lg:col-span-8 flex flex-col min-h-[500px]">
          
          {activeTab === 'chat-pdf' ? (
            
            /* Chat Interface */
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-premium dark:shadow-none rounded-2xl flex flex-col flex-1 overflow-hidden">
              
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Chat Room
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate max-w-[200px] md:max-w-sm">
                      {activeDocument ? `Target: ${activeDocument}` : 'No document selected'}
                    </p>
                  </div>
                </div>
                {activeDocument && (
                  <div className="bg-emerald-100/60 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>Ready</span>
                  </div>
                )}
              </div>

              {/* Chat Message Window */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 max-h-[450px] min-h-[350px]">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 max-w-[85%] ${
                      msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${
                      msg.sender === 'user' 
                        ? 'bg-slate-800 text-white border-slate-700' 
                        : 'bg-primary/10 text-primary border-primary/20'
                    }`}>
                      {msg.sender === 'user' ? <FileText size={14} /> : <Bot size={14} />}
                    </div>
                    
                    <div className="space-y-1">
                      <div className={`p-3.5 rounded-2xl text-xs leading-relaxed font-medium ${
                        msg.sender === 'user'
                          ? 'bg-primary text-white rounded-tr-none'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none'
                      }`}>
                        {msg.text}
                      </div>

                      {/* Display Sources/References if returned */}
                      {msg.retrievedChunks && msg.retrievedChunks.length > 0 && (
                        <details className="text-[10px] text-slate-450 cursor-pointer pl-1 mt-1 font-semibold">
                          <summary className="hover:text-primary">View retrieved context sources ({msg.retrievedChunks.length})</summary>
                          <div className="mt-1.5 space-y-1.5 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                            {msg.retrievedChunks.map((chunk, cIdx) => (
                              <p key={cIdx} className="italic text-slate-500 border-l-2 border-primary/40 pl-2 leading-normal">
                                "...{chunk}..."
                              </p>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
                
                {sending && (
                  <div className="flex items-start gap-3 max-w-[85%]">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                      <Bot size={14} />
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1.5 min-h-[36px]">
                      <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={!activeDocument || sending}
                  placeholder={
                    activeDocument 
                      ? `Ask a question about '${activeDocument}'...` 
                      : 'Upload and select a PDF on the left first'
                  }
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={!activeDocument || !inputMessage.trim() || sending}
                  className="bg-primary hover:bg-primary-dark disabled:bg-slate-100 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 px-4 rounded-xl flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                >
                  <Send size={14} />
                </button>
              </form>

            </div>
          ) : (
            
            /* AI Data Extractor Interface */
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-premium dark:shadow-none rounded-2xl p-6 flex flex-col flex-1">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={16} className="text-primary" />
                    <span>AI Data Extractor</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Automatically detect schema, entities, and summaries.
                  </p>
                </div>
                <button
                  onClick={handleExtract}
                  disabled={!activeDocument || extracting}
                  className="bg-primary hover:bg-primary-dark disabled:bg-slate-100 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {extracting ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      <span>Extracting...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} />
                      <span>Run Extractor</span>
                    </>
                  )}
                </button>
              </div>

              {!activeDocument ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                  <Sparkles size={48} className="mb-2 text-slate-300 opacity-50" />
                  <p className="text-xs font-bold">No document selected</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Select a PDF file from the library panel to begin extraction.</p>
                </div>
              ) : extractedData ? (
                <div className="space-y-5 animate-fade-in text-xs font-medium">
                  {/* Summary Block */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <h4 className="font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 text-[10px]">
                      Document Summary
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                      {extractedData.summary}
                    </p>
                  </div>

                  {/* Metadata Block */}
                  <div>
                    <h4 className="font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 text-[10px]">
                      Extracted Metadata Attributes
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(extractedData.metadata).map(([key, value]) => (
                        <div key={key} className="p-3 bg-white dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800 rounded-xl">
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{key}</p>
                          <p className="text-slate-700 dark:text-slate-200 font-bold mt-1 text-xs truncate">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Entity Entities Block */}
                  <div>
                    <h4 className="font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 text-[10px]">
                      Key Entity Classification
                    </h4>
                    <div className="border border-slate-200/50 dark:border-slate-850 rounded-xl overflow-hidden">
                      <table className="min-w-full divide-y divide-slate-155">
                        <thead className="bg-slate-50 dark:bg-slate-900/30">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-400 uppercase tracking-wider">Entity Class</th>
                            <th className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-400 uppercase tracking-wider">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-155 bg-white dark:bg-slate-900">
                          {extractedData.entities.map((entity, i) => (
                            <tr key={i}>
                              <td className="px-4 py-2.5 font-bold text-slate-600 dark:text-slate-400">{entity.name}</td>
                              <td className="px-4 py-2.5 text-slate-800 dark:text-slate-200 font-semibold">{entity.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                  <Sparkles size={36} className="mb-2 text-slate-300 animate-pulse" />
                  <p className="text-xs font-semibold">Document loaded successfully</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Click "Run Extractor" to analyze semantic entities and generate metadata summaries.</p>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default AiHub;
