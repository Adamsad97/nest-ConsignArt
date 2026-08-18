import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { reportService } from '../services/report.service';
import { artistService } from '../services/artist.service';
import type { Artist, ArtistStatement } from '../types';
import Modal from '../components/Modal';

const Reports: React.FC = () => {
  const { user } = useAuth();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [statements, setStatements] = useState<ArtistStatement[]>([]);
  const [selectedArtistId, setSelectedArtistId] = useState('');
  const [artistDashboard, setArtistDashboard] = useState<any>(null);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [stmtForm, setStmtForm] = useState({ artistId: '', periodStart: '', periodEnd: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user?.role === 'gallery' || user?.role === 'admin') {
      loadArtists();
    }
  }, [user]);

  const loadArtists = async () => {
    try {
      const res = await artistService.getAll();
      const list = Array.isArray(res) ? res : (res as any).data ?? [];
      setArtists(list);
    } catch { /* non bloquant */ }
  };

  const handleSelectArtist = async (artistId: string) => {
    setSelectedArtistId(artistId);
    if (!artistId) { setArtistDashboard(null); setStatements([]); return; }
    try {
      const [dash, stmts] = await Promise.all([
        reportService.getArtistDashboard(artistId),
        reportService.getStatementsByArtist(artistId),
      ]);
      setArtistDashboard(dash);
      setStatements(Array.isArray(stmts) ? stmts : []);
    } catch (err: any) {
      setError('Impossible de charger les données de cet artiste.');
    }
  };

  const handleGenerateStatement = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try {
      await reportService.generateStatement(stmtForm.artistId, stmtForm.periodStart, stmtForm.periodEnd);
      setSuccess('Relevé généré avec succès.');
      setShowStatementModal(false);
      if (stmtForm.artistId === selectedArtistId) handleSelectArtist(selectedArtistId);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erreur.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  return (
    <div className="container mx-auto px-6 py-10 fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.8rem', color: 'var(--texte)' }}>Rapports</h1>
        {(user?.role === 'gallery' || user?.role === 'admin') && (
          <button className="btn-primary" data-cy="btn-generate-statement" onClick={() => setShowStatementModal(true)}>
            Générer un relevé
          </button>
        )}
      </div>

      {success && <div className="success-box" data-cy="success-message">{success}</div>}
      {error && <div className="error-box">{error}</div>}

      {/* Sélecteur d'artiste */}
      {(user?.role === 'gallery' || user?.role === 'admin') && (
        <div className="card mb-6">
          <label className="form-label mb-2">Sélectionner un artiste pour consulter ses données</label>
          <select className="form-input" data-cy="select-artist" value={selectedArtistId} onChange={(e) => handleSelectArtist(e.target.value)}>
            <option value="">— Choisir un artiste —</option>
            {artists.map((a) => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}
          </select>
        </div>
      )}

      {/* Dashboard artiste sélectionné */}
      {artistDashboard && (
        <div className="mb-8">
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.2rem', color: 'var(--texte)', marginBottom: '1rem' }}>
            Dashboard artiste
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="card">
              <p className="form-label" style={{ marginBottom: '0.5rem' }}>Gains totaux</p>
              <p data-cy="artist-earnings" style={{ fontSize: '1.8rem', fontFamily: 'Georgia, serif', color: 'var(--or)' }}>
                {Number(artistDashboard.totalEarnings ?? 0).toLocaleString('fr-FR')} €
              </p>
            </div>
            <div className="card">
              <p className="form-label" style={{ marginBottom: '0.5rem' }}>Œuvres actives</p>
              <p data-cy="artist-artworks-count" style={{ fontSize: '1.8rem', fontFamily: 'Georgia, serif', color: 'var(--texte)' }}>
                {artistDashboard.activeArtworksCount ?? 0}
              </p>
            </div>
            <div className="card">
              <p className="form-label" style={{ marginBottom: '0.5rem' }}>Ventes réalisées</p>
              <p style={{ fontSize: '1.8rem', fontFamily: 'Georgia, serif', color: 'var(--texte)' }}>
                {artistDashboard.salesCount ?? 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Liste des relevés */}
      {selectedArtistId && (
        <div>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.2rem', color: 'var(--texte)', marginBottom: '1rem' }}>
            Relevés de compte
          </h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table-consignart" data-cy="statements-list">
              <thead>
                <tr>
                  <th>Période</th>
                  <th>Ventes</th>
                  <th>Montant artiste</th>
                  <th>Généré le</th>
                </tr>
              </thead>
              <tbody>
                {statements.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--texte-muted)', padding: '2rem' }}>Aucun relevé</td></tr>
                ) : statements.map((s) => (
                  <tr key={s.id}>
                    <td style={{ color: 'var(--texte-muted)', fontSize: '0.85rem' }}>
                      {new Date(s.periodStart).toLocaleDateString('fr-FR')} → {new Date(s.periodEnd).toLocaleDateString('fr-FR')}
                    </td>
                    <td>{s.totalSales}</td>
                    <td style={{ color: 'var(--or)', fontWeight: 700 }}>{Number(s.totalArtistAmount).toLocaleString('fr-FR')} €</td>
                    <td style={{ color: 'var(--texte-muted)', fontSize: '0.8rem' }}>{new Date(s.generatedAt).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal génération relevé */}
      {showStatementModal && (
        <Modal title="Générer un relevé artiste" onClose={() => setShowStatementModal(false)}>
          <form onSubmit={handleGenerateStatement}>
            <div className="mb-4">
              <label className="form-label">Artiste *</label>
              <select className="form-input" data-cy="select-artist" value={stmtForm.artistId} onChange={(e) => setStmtForm({ ...stmtForm, artistId: e.target.value })} required>
                <option value="">— Choisir —</option>
                {artists.map((a) => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="form-label">Début de période *</label>
                <input type="date" className="form-input" data-cy="input-periodStart" value={stmtForm.periodStart} onChange={(e) => setStmtForm({ ...stmtForm, periodStart: e.target.value })} required />
              </div>
              <div>
                <label className="form-label">Fin de période *</label>
                <input type="date" className="form-input" data-cy="input-periodEnd" value={stmtForm.periodEnd} onChange={(e) => setStmtForm({ ...stmtForm, periodEnd: e.target.value })} required />
              </div>
            </div>
            {error && <div className="error-box">{error}</div>}
            <div className="flex gap-3 justify-end">
              <button type="button" className="btn-outline" onClick={() => setShowStatementModal(false)}>Annuler</button>
              <button type="submit" className="btn-primary" data-cy="submit-statement">Générer</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Reports;
