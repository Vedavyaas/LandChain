import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PropertiesPage from './pages/PropertiesPage';
import PropertyRegisterPage from './pages/PropertyRegisterPage';
import { PropertyDetailsPage } from './pages/PropertyDetailsPage';
import { PropertyDocumentsPage } from './pages/PropertyDocumentsPage';

const App: React.FC = () => (
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/properties"
          element={
            <ProtectedRoute>
              <PropertiesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/properties/register"
          element={
            <ProtectedRoute>
              <PropertyRegisterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/properties/:propertyId"
          element={
            <ProtectedRoute>
              <PropertyDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/properties/:propertyId/documents"
          element={
            <ProtectedRoute>
              <PropertyDocumentsPage />
            </ProtectedRoute>
          }
        />
        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
