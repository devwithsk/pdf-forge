import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import ToolPage from './pages/ToolPage';
import { useApp } from './context/AppContext';

function App() {
  const { hasSelectedFiles } = useApp();

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow pb-16">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tool/:toolId" element={<ToolPage />} />
        </Routes>
      </main>
      {!hasSelectedFiles && <Footer />}
    </div>
  );
}

export default App;
