import React, { createContext, useState, useContext } from 'react';

const AppContext = createContext();

export const TOOLS = [
  {
    id: 'merge',
    name: 'Merge PDF',
    desc: 'Combine multiple PDF files into one single PDF document.',
    icon: 'Layers',
    module: 'Basic File Manipulation',
    category: 'organize',
    endpoint: '/merge',
    accept: '.pdf',
    multiple: true
  },
  {
    id: 'split',
    name: 'Split PDF',
    desc: 'Extract specific page ranges or split all pages into separate PDFs.',
    icon: 'Scissors',
    module: 'Basic File Manipulation',
    category: 'organize',
    endpoint: '/split',
    accept: '.pdf',
    multiple: false
  },
  {
    id: 'rotate',
    name: 'Rotate PDF',
    desc: 'Rotate PDF pages clockwise by 90, 180, or 270 degrees.',
    icon: 'RotateCw',
    module: 'Basic File Manipulation',
    category: 'edit',
    endpoint: '/rotate',
    accept: '.pdf',
    multiple: false
  },
  {
    id: 'protect',
    name: 'Protect PDF',
    desc: 'Encrypt your PDF file with a strong password to prevent unauthorized access.',
    icon: 'Lock',
    module: 'Security & Formatting',
    category: 'security',
    endpoint: '/protect',
    accept: '.pdf',
    multiple: false
  },
  {
    id: 'unlock',
    name: 'Unlock PDF',
    desc: 'Remove password security from your PDF file using the known password.',
    icon: 'Unlock',
    module: 'Security & Formatting',
    category: 'security',
    endpoint: '/unlock',
    accept: '.pdf',
    multiple: false
  },
  {
    id: 'watermark',
    name: 'Watermark PDF',
    desc: 'Overlay text watermark onto PDF pages with custom style and opacity.',
    icon: 'Type',
    module: 'Security & Formatting',
    category: 'edit',
    endpoint: '/watermark',
    accept: '.pdf',
    multiple: false
  },
  {
    id: 'pdf2jpg',
    name: 'PDF to Jpg',
    desc: 'Convert PDF pages into high-quality JPG or PNG image files bundled in a ZIP.',
    icon: 'FileImage',
    module: 'Image Conversion',
    category: 'convert-from',
    endpoint: '/pdf2jpg',
    accept: '.pdf',
    multiple: false
  },
  {
    id: 'jpg2pdf',
    name: 'Jpg to PDF',
    desc: 'Convert image files (JPG, JPEG, PNG) into a single unified PDF document.',
    icon: 'Images',
    module: 'Image Conversion',
    category: 'convert-to',
    endpoint: '/jpg2pdf',
    accept: '.jpg,.jpeg,.png',
    multiple: true
  },
  {
    id: 'word2pdf',
    name: 'Word to PDF',
    desc: 'Convert Microsoft Word documents (.docx) to PDF format.',
    icon: 'FileText',
    module: 'Document Conversion',
    category: 'convert-to',
    endpoint: '/word2pdf',
    accept: '.docx',
    multiple: false
  },
  {
    id: 'excel2pdf',
    name: 'Excel to PDF',
    desc: 'Convert Excel spreadsheets (.xlsx) to PDF pages.',
    icon: 'Table',
    module: 'Document Conversion',
    category: 'convert-to',
    endpoint: '/excel2pdf',
    accept: '.xlsx',
    multiple: false
  },
  {
    id: 'pdf2word',
    name: 'PDF to Word',
    desc: 'Convert your PDF back into editable Microsoft Word (.docx) documents.',
    icon: 'FileEdit',
    module: 'Document Conversion',
    category: 'convert-from',
    endpoint: '/pdf2word',
    accept: '.pdf',
    multiple: false
  },
  {
    id: 'pdf2excel',
    name: 'PDF to Excel',
    desc: 'Convert your PDF tables and text into Excel spreadsheets (.xlsx).',
    icon: 'TableProperties',
    module: 'Document Conversion',
    category: 'convert-from',
    endpoint: '/pdf2excel',
    accept: '.pdf',
    multiple: false
  },
  {
    id: 'pdf2ppt',
    name: 'PDF to PowerPoint',
    desc: 'Convert PDF documents to Microsoft PowerPoint presentations (.pptx).',
    icon: 'Presentation',
    module: 'Document Conversion',
    category: 'convert-from',
    endpoint: '/pdf2ppt',
    accept: '.pdf',
    multiple: false
  },
  {
    id: 'ppt2pdf',
    name: 'PowerPoint to PDF',
    desc: 'Convert PowerPoint presentations (.pptx) to PDF format.',
    icon: 'Tv',
    module: 'Document Conversion',
    category: 'convert-to',
    endpoint: '/ppt2pdf',
    accept: '.pptx',
    multiple: false
  },
  {
    id: 'html2pdf',
    name: 'HTML to PDF',
    desc: 'Convert HTML files or web pages into a formatted PDF document.',
    icon: 'Code',
    module: 'Document Conversion',
    category: 'convert-to',
    endpoint: '/html2pdf',
    accept: '.html',
    multiple: false
  }
];

export const CATEGORIES = [
  {
    id: 'organize',
    name: 'Organize PDF',
    tools: [
      { id: 'merge', name: 'Merge PDF', icon: 'Layers', desc: 'Combine multiple PDF files.', isPlaceholder: false },
      { id: 'split', name: 'Split PDF', icon: 'Scissors', desc: 'Split a PDF into multiple files.', isPlaceholder: false },
      { id: 'remove', name: 'Remove Pages', icon: 'Trash2', desc: 'Remove unwanted pages.', isPlaceholder: true },
      { id: 'organize-tool', name: 'Organize PDF', icon: 'FolderSync', desc: 'Reorder pages in a PDF.', isPlaceholder: true }
    ]
  },
  {
    id: 'optimize',
    name: 'Optimize PDF',
    tools: [
      { id: 'compress', name: 'Compress PDF', icon: 'FileDown', desc: 'Reduce PDF file size.', isPlaceholder: true },
      { id: 'repair', name: 'Repair PDF', icon: 'Wrench', desc: 'Fix damaged PDF documents.', isPlaceholder: true }
    ]
  },
  {
    id: 'convert-to',
    name: 'Convert to PDF',
    tools: [
      { id: 'jpg2pdf', name: 'Jpg to PDF', icon: 'Images', desc: 'Convert JPG, JPEG, PNG to PDF.', isPlaceholder: false },
      { id: 'word2pdf', name: 'Word to PDF', icon: 'FileText', desc: 'Convert Word doc to PDF.', isPlaceholder: false },
      { id: 'excel2pdf', name: 'Excel to PDF', icon: 'Table', desc: 'Convert Excel sheet to PDF.', isPlaceholder: false },
      { id: 'ppt2pdf', name: 'PowerPoint to PDF', icon: 'Tv', desc: 'Convert PPTX presentation to PDF.', isPlaceholder: false },
      { id: 'html2pdf', name: 'HTML to PDF', icon: 'Code', desc: 'Convert HTML webpage to PDF.', isPlaceholder: false }
    ]
  },
  {
    id: 'convert-from',
    name: 'Convert from PDF',
    tools: [
      { id: 'pdf2jpg', name: 'PDF to Jpg', icon: 'FileImage', desc: 'Convert PDF pages to JPG/PNG.', isPlaceholder: false },
      { id: 'pdf2word', name: 'PDF to Word', icon: 'FileEdit', desc: 'Convert PDF to Word doc.', isPlaceholder: false },
      { id: 'pdf2excel', name: 'PDF to Excel', icon: 'TableProperties', desc: 'Convert PDF text to Excel sheet.', isPlaceholder: false },
      { id: 'pdf2ppt', name: 'PDF to PowerPoint', icon: 'Presentation', desc: 'Convert PDF to PPTX presentation.', isPlaceholder: false }
    ]
  },
  {
    id: 'edit',
    name: 'Edit PDF',
    tools: [
      { id: 'rotate', name: 'Rotate PDF', icon: 'RotateCw', desc: 'Rotate PDF pages easily.', isPlaceholder: false },
      { id: 'watermark', name: 'Watermark PDF', icon: 'Type', desc: 'Add image or text watermark.', isPlaceholder: false },
      { id: 'numbers', name: 'Page Numbers', icon: 'Binary', desc: 'Add page numbers to PDF.', isPlaceholder: true }
    ]
  },
  {
    id: 'security',
    name: 'PDF Security',
    tools: [
      { id: 'protect', name: 'Protect PDF', icon: 'Lock', desc: 'Secure PDF with a password.', isPlaceholder: false },
      { id: 'unlock', name: 'Unlock PDF', icon: 'Unlock', desc: 'Remove PDF password security.', isPlaceholder: false }
    ]
  }
];

export const AppProvider = ({ children }) => {
  const [conversionResult, setConversionResult] = useState(null); // { downloadUrl, fileName, size }
  const [stats, setStats] = useState({ totalConversions: 0 });

  return (
    <AppContext.Provider value={{
      tools: TOOLS,
      categories: CATEGORIES,
      conversionResult,
      setConversionResult,
      stats,
      setStats
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
