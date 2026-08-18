import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { reportService } from '../services/report.service';
import StatusBadge from '../components/StatusBadge';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchDashboard();
  }, [user]);

  const fetchDashboard = async () => {
    try {
      let res;
      if (user?.role === 'admin') {
        res = await reportService.getAdminDashboard();
      } else if (user?.role === 'gallery') {
        res = await reportService.getGalleryDashboard();
      } else {
        // artist / collector : pas de dashboard dédié pour l'instant
        setLoading(false);
        return;
      }
      setData(res);
    } catch (e: any) {
      setError('Impossible de charger le tableau de bord.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-10 fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.8rem', color: 'var(--texte)' }}>
            Tableau de bord
          </h1>
          <p style={{ color: 'var(--texte-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Connecté en tant que <span style={{ color: 'var(--or)' }}>{user?.email}</span>
            {' '}&mdash;{' '}
            <StatusBadge status={user?.role ?? ''} />
          </p>
        </div>
      </div>

      {!user?.isActive && user?.role === 'gallery' && (
        <div className="error-box mb-6">
          Votre compte galerie est en attente d&apos;activation par un administrateur.
        </div>
      )}

      {loading && (
        <div style={{ color: 'var(--texte-muted)', textAlign: 'center', padding: '3rem', fontSize: '0.875rem', letterSpacing: '0.1em' }}>
          Chargement des données...
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      {/* Dashboard Galerie */}
      {data && user?.role === 'gallery' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard label="Chiffre d'affaires" value={`${(data.totalRevenue ?? 0).toLocaleString('fr-FR')} €`} dataCy="dashboard-revenue" />
          <StatCard label="Ventes réalisées" value={data.salesCount ?? 0} dataCy="dashboard-sales-count" />
          <StatCard label="Artistes actifs" value={data.artistsCount ?? 0} />
        </div>
      )}

      {/* Dashboard Admin */}
      {data && user?.role === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard label="Galeries" value={data.totalGalleries ?? 0} dataCy="admin-total-galleries" />
          <StatCard label="Artistes" value={data.totalArtists ?? 0} dataCy="admin-total-artists" />
          <StatCard label="Chiffre d'affaires" value={`${(data.totalRevenue ?? 0).toLocaleString('fr-FR')} €`} dataCy="admin-total-revenue" />
          <StatCard label="Ventes" value={data.totalSales ?? 0} />
        </div>
      )}

      {/* Artiste ou collectionneur : message simple */}
      {(user?.role === 'artist' || user?.role === 'collector') && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--texte-muted)', fontSize: '0.9rem' }}>
            Bienvenue sur ConsignArt. Parcourez les{' '}
            <a href="/artworks" style={{ color: 'var(--or)' }}>œuvres disponibles</a>.
          </p>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: any; dataCy?: string }> = ({ label, value, dataCy }) => (
  <div className="card">
    <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--texte-muted)', marginBottom: '0.75rem' }}>
      {label}
    </p>
    <p style={{ fontSize: '2rem', fontFamily: 'Georgia, serif', color: 'var(--or)', fontWeight: 'bold' }} data-cy={dataCy}>
      {value}
    </p>
  </div>
);

export default Dashboard;
