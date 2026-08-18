import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <nav style={{
      backgroundColor: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to={user ? '/dashboard' : '/'} style={{ textDecoration: 'none' }}>
          <div className="flex items-center gap-3">
            <span style={{ color: 'var(--or)', fontSize: '1.4rem', fontFamily: 'Georgia, serif', fontWeight: 'bold', letterSpacing: '0.05em' }}>
              ConsignArt
            </span>
            <span style={{ color: 'var(--texte-muted)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', paddingTop: '2px' }}>
              Galerie
            </span>
          </div>
        </Link>

        {/* Navigation principale */}
        {user && (
          <div className="hidden md:flex items-center gap-1">
            <NavLink to="/artworks" active={isActive('/artworks')} label="Œuvres" />
            {(user.role === 'gallery' || user.role === 'admin') && (
              <>
                <NavLink to="/artists" active={isActive('/artists')} label="Artistes" />
                <NavLink to="/exhibitions" active={isActive('/exhibitions')} label="Expositions" />
                <NavLink to="/loans" active={isActive('/loans')} label="Prêts" />
              </>
            )}
            <NavLink to="/sales" active={isActive('/sales')} label="Ventes" />
            <NavLink to="/reports" active={isActive('/reports')} label="Rapports" />
          </div>
        )}

        {/* Partie droite */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="hidden md:flex items-center gap-3">
                <span style={{ fontSize: '0.8rem', color: 'var(--texte-muted)' }}>
                  {user.email}
                </span>
                <span className={`badge badge-${user.role}`}>{user.role}</span>
              </div>
              <button
                onClick={handleLogout}
                data-cy="logout-btn"
                className="btn-outline"
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.9rem' }}
              >
                Déconnexion
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" style={{ color: 'var(--texte-muted)', fontSize: '0.875rem', textDecoration: 'none' }}>
                Connexion
              </Link>
              <Link to="/register" className="btn-primary" style={{ fontSize: '0.75rem' }}>
                Inscription
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

const NavLink: React.FC<{ to: string; label: string; active: boolean }> = ({ to, label, active }) => (
  <Link
    to={to}
    style={{
      color: active ? 'var(--or)' : 'var(--texte-muted)',
      textDecoration: 'none',
      fontSize: '0.8rem',
      fontWeight: active ? 600 : 400,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      padding: '0.4rem 0.75rem',
      borderBottom: active ? '2px solid var(--or)' : '2px solid transparent',
      transition: 'color 0.2s, border-color 0.2s',
    }}
  >
    {label}
  </Link>
);

export default Navbar;
