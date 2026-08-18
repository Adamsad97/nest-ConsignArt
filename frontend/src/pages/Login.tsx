import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Identifiants incorrects.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--noir)' }}>
      <div className="fade-in" style={{ width: '100%', maxWidth: '400px', padding: '0 1rem' }}>

        {/* En-tête */}
        <div className="text-center mb-8">
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2rem', color: 'var(--or)', marginBottom: '0.5rem' }}>
            ConsignArt
          </h1>
          <p style={{ color: 'var(--texte-muted)', fontSize: '0.8rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Plateforme de consignation d&apos;œuvres
          </p>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--texte-muted)', marginBottom: '1.5rem' }}>
            Connexion
          </h2>

          {error && (
            <div className="error-box" data-cy="error-message">{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="form-label">Adresse email</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@galerie.com"
                required
              />
            </div>
            <div className="mb-6">
              <label className="form-label">Mot de passe</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', padding: '0.75rem' }}
              disabled={loading}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <hr className="divider-or" />
          <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--texte-muted)' }}>
            Pas encore de compte ?{' '}
            <Link to="/register" style={{ color: 'var(--or)', textDecoration: 'none' }}>
              S&apos;inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
