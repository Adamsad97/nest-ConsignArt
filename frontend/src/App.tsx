import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Artworks from './pages/Artworks';
import Artists from './pages/Artists';
import Exhibitions from './pages/Exhibitions';
import Loans from './pages/Loans';
import Sales from './pages/Sales';
import Reports from './pages/Reports';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--noir)', display: 'flex', flexDirection: 'column' }}>
          <Navbar />
          <main style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Routes protégées */}
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/artworks" element={<Artworks />} />
              <Route path="/artists" element={<PrivateRoute><Artists /></PrivateRoute>} />
              <Route path="/exhibitions" element={<PrivateRoute><Exhibitions /></PrivateRoute>} />
              <Route path="/loans" element={<PrivateRoute><Loans /></PrivateRoute>} />
              <Route path="/sales" element={<PrivateRoute><Sales /></PrivateRoute>} />
              <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
