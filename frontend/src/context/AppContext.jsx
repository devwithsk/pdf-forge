import React, { createContext, useState, useContext } from 'react';

const AppContext = createContext();

export const TOOLS = [
  {
    id: 'merge',
    name: 'Merge PDF',
    desc: 'Combine multiple PDF files into one single PDF document.',
    icon: 'Layers',
    module: 'Basic File Manipulation',
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
    endpoint: '/watermark',
    accept: '.pdf',
    multiple: false
  },
  {
    id: 'pdf2jpg',
    name: 'PDF to JPG',
    desc: 'Convert PDF pages into high-quality JPG image files bundled in a ZIP.',
    icon: 'FileImage',
    module: 'Image Conversion',
    endpoint: '/pdf2jpg',
    accept: '.pdf',
    multiple: false
  },
  {
    id: 'jpg2pdf',
    name: 'JPG to PDF',
    desc: 'Convert images (JPG, PNG) into a single unified PDF document.',
    icon: 'Images',
    module: 'Image Conversion',
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
    endpoint: '/pdf2word',
    accept: '.pdf',
    multiple: false
  }
];

export const AppProvider = ({ children }) => {
  const [conversionResult, setConversionResult] = useState(null); // { downloadUrl, fileName, size }
  const [stats, setStats] = useState({ totalConversions: 0 });
  
  return (
    <AppContext.Provider value={{
      tools: TOOLS,
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
