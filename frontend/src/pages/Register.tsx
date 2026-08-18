import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('gallery');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.register({ email, password, role });
      // Après inscription on redirige vers login avec un message de succès
      navigate('/login');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Une erreur est survenue lors de l\'inscription.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--noir)' }}>
      <div className="fade-in" style={{ width: '100%', maxWidth: '420px', padding: '0 1rem' }}>

        <div className="text-center mb-8">
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2rem', color: 'var(--or)', marginBottom: '0.5rem' }}>
            ConsignArt
          </h1>
          <p style={{ color: 'var(--texte-muted)', fontSize: '0.8rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Rejoindre la plateforme
          </p>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--texte-muted)', marginBottom: '1.5rem' }}>
            Créer un compte
          </h2>

          {error && <div className="error-box" data-cy="error-message">{error}</div>}

          <form onSubmit={handleSubmit} data-cy="form-register">
            <div className="mb-4">
              <label className="form-label">Adresse email</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mb-4">
              <label className="form-label">Mot de passe</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <div className="mb-6">
              <label className="form-label">Type de compte</label>
              <select
                className="form-input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="gallery">Galerie</option>
                <option value="artist">Artiste</option>
                <option value="collector">Collectionneur</option>
              </select>
              {role === 'gallery' && (
                <p style={{ color: 'var(--texte-muted)', fontSize: '0.75rem', marginTop: '0.4rem' }}>
                  ⚠ Les comptes galerie doivent être activés par un admin avant utilisation.
                </p>
              )}
            </div>
            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', padding: '0.75rem' }}
              disabled={loading}
            >
              {loading ? 'Inscription...' : 'Créer mon compte'}
            </button>
          </form>

          <hr className="divider-or" />
          <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--texte-muted)' }}>
            Déjà inscrit ?{' '}
            <Link to="/login" style={{ color: 'var(--or)', textDecoration: 'none' }}>
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
