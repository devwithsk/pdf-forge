import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import ToolPage from './pages/ToolPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProtectedRoute from './components/ProtectedRoute';
import Profile from './pages/Profile';
import AiHub from './pages/AiHub';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import ApiDocs from './pages/ApiDocs';
import Contact from './pages/Contact';
import { useApp } from './context/AppContext';

function App() {
  const { hasSelectedFiles } = useApp() || {};
  const location = useLocation();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      <main className="flex-1 overflow-y-auto flex flex-col">
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tool/:toolId" element={<ToolPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/ai-hub" 
              element={
                <ProtectedRoute>
                  <AiHub />
                </ProtectedRoute>
              } 
            />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/api-docs" element={<ApiDocs />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </div>
        {(location.pathname === '/' || location.pathname === '/contact') && !hasSelectedFiles && <Footer />}
      </main>
    </div>
  );
}

export default App;

