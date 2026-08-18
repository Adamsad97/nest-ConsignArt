import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { artworkService } from '../services/artwork.service';
import { artistService } from '../services/artist.service';
import { useAuth } from '../context/AuthContext';
import type { Artwork, Artist } from '../types';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

const Artworks: React.FC = () => {
  const { user } = useAuth();
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState<Artwork | null>(null);

  // Formulaire ajout
  const [form, setForm] = useState({
    title: '', description: '', price: '', reservePrice: '',
    medium: '', dimensions: '', artistId: '',
  });

  const [statusForm, setStatusForm] = useState({ status: 'available', reason: '' });

  useEffect(() => {
    loadArtworks();
    if (user && (user.role === 'gallery' || user.role === 'admin')) {
      loadArtists();
    }
  }, []);

  const loadArtworks = async () => {
    try {
      const res = await artworkService.getAll();
      const list = Array.isArray(res) ? res : (res as any).data ?? [];
      setArtworks(list);
    } catch {
      setError('Impossible de charger les œuvres.');
    } finally {
      setLoading(false);
    }
  };

  const loadArtists = async () => {
    try {
      const res = await artistService.getAll();
      const list = Array.isArray(res) ? res : (res as any).data ?? [];
      setArtists(list);
    } catch { /* pas critique */ }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await artworkService.create({
        ...form,
        price: Number(form.price),
        reservePrice: Number(form.reservePrice),
      });
      setSuccess('Œuvre ajoutée avec succès.');
      setShowAddModal(false);
      setForm({ title: '', description: '', price: '', reservePrice: '', medium: '', dimensions: '', artistId: '' });
      loadArtworks();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erreur lors de la création.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  const handleChangeStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showStatusModal) return;
    try {
      await artworkService.changeStatus(showStatusModal.id, statusForm.status as any, statusForm.reason);
      setSuccess('Statut mis à jour.');
      setShowStatusModal(null);
      loadArtworks();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette œuvre ?')) return;
    try {
      await artworkService.remove(id);
      setSuccess('Œuvre supprimée.');
      loadArtworks();
    } catch {
      setError('Impossible de supprimer cette œuvre.');
    }
  };

  const canEdit = user && (user.role === 'gallery' || user.role === 'admin');

  return (
    <div className="container mx-auto px-6 py-10 fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.8rem', color: 'var(--texte)' }}>
            Œuvres d&apos;art
          </h1>
          <p style={{ color: 'var(--texte-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            {artworks.length} œuvre{artworks.length !== 1 ? 's' : ''} dans la collection
          </p>
        </div>
        {canEdit && (
          <button className="btn-primary" data-cy="btn-add-artwork" onClick={() => setShowAddModal(true)}>
            + Ajouter une œuvre
          </button>
        )}
      </div>

      {success && <div className="success-box" data-cy="success-message">{success}</div>}
      {error && <div className="error-box" data-cy="error-message">{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--texte-muted)', padding: '3rem' }}>Chargement...</div>
      ) : (
        <div data-cy="artworks-list">
          {artworks.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--texte-muted)' }}>Aucune œuvre pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {artworks.map((artwork) => (
                <div key={artwork.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="flex items-start justify-between">
                    <h3 data-cy="artwork-title" style={{ fontFamily: 'Georgia, serif', fontSize: '1.1rem', color: 'var(--texte)', flex: 1 }}>
                      {artwork.title}
                    </h3>
                    <StatusBadge status={artwork.status} dataCy="artwork-status" />
                  </div>

                  {artwork.artist && (
                    <p style={{ color: 'var(--texte-muted)', fontSize: '0.8rem' }}>
                      {artwork.artist.firstName} {artwork.artist.lastName}
                    </p>
                  )}

                  {artwork.medium && (
                    <p style={{ color: 'var(--texte-muted)', fontSize: '0.78rem' }}>
                      {artwork.medium}{artwork.dimensions ? ` · ${artwork.dimensions}` : ''}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-auto" style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                    <span data-cy="artwork-price" style={{ color: 'var(--or)', fontWeight: 700, fontSize: '1.1rem' }}>
                      {Number(artwork.price).toLocaleString('fr-FR')} €
                    </span>
                    <div className="flex gap-2">
                      <Link to={`/artworks/${artwork.id}`} style={{ color: 'var(--texte-muted)', fontSize: '0.75rem', textDecoration: 'none' }}>
                        Détail →
                      </Link>
                      {canEdit && (
                        <>
                          <button
                            data-cy="btn-change-status"
                            onClick={() => { setShowStatusModal(artwork); setStatusForm({ status: artwork.status, reason: '' }); }}
                            style={{ color: 'var(--texte-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}
                          >
                            Statut
                          </button>
                          <button
                            data-cy="btn-delete-artwork"
                            onClick={() => handleDelete(artwork.id)}
                            style={{ color: 'var(--rouge)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}
                          >
                            ×
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal ajout d'œuvre */}
      {showAddModal && (
        <Modal title="Nouvelle œuvre" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleCreate} data-cy="form-artwork">
            <div className="mb-4">
              <label className="form-label">Titre *</label>
              <input className="form-input" data-cy="input-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="mb-4">
              <label className="form-label">Description</label>
              <textarea className="form-input" data-cy="input-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="form-label">Prix (€) *</label>
                <input type="number" className="form-input" data-cy="input-price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required min="0" />
              </div>
              <div>
                <label className="form-label">Prix de réserve (€)</label>
                <input type="number" className="form-input" data-cy="input-reservePrice" value={form.reservePrice} onChange={(e) => setForm({ ...form, reservePrice: e.target.value })} min="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="form-label">Technique</label>
                <input className="form-input" data-cy="input-medium" value={form.medium} onChange={(e) => setForm({ ...form, medium: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Dimensions</label>
                <input className="form-input" data-cy="input-dimensions" value={form.dimensions} onChange={(e) => setForm({ ...form, dimensions: e.target.value })} />
              </div>
            </div>
            <div className="mb-6">
              <label className="form-label">Artiste *</label>
              <select className="form-input" data-cy="select-artist" value={form.artistId} onChange={(e) => setForm({ ...form, artistId: e.target.value })} required>
                <option value="">— Sélectionner —</option>
                {artists.map((a) => (
                  <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
                ))}
              </select>
            </div>
            {error && <div className="error-box">{error}</div>}
            <div className="flex gap-3 justify-end">
              <button type="button" className="btn-outline" onClick={() => setShowAddModal(false)}>Annuler</button>
              <button type="submit" className="btn-primary" data-cy="submit-artwork">Enregistrer</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal changement de statut */}
      {showStatusModal && (
        <Modal title="Changer le statut" onClose={() => setShowStatusModal(null)}>
          <form onSubmit={handleChangeStatus}>
            <p style={{ color: 'var(--texte-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Œuvre : <strong style={{ color: 'var(--texte)' }}>{showStatusModal.title}</strong>
            </p>
            <div className="mb-4">
              <label className="form-label">Nouveau statut</label>
              <select className="form-input" data-cy="select-status" value={statusForm.status} onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}>
                <option value="available">Disponible</option>
                <option value="on_loan">En prêt</option>
                <option value="sold">Vendu</option>
                <option value="returned">Retourné</option>
              </select>
            </div>
            <div className="mb-6">
              <label className="form-label">Raison (optionnel)</label>
              <input className="form-input" value={statusForm.reason} onChange={(e) => setStatusForm({ ...statusForm, reason: e.target.value })} />
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" className="btn-outline" onClick={() => setShowStatusModal(null)}>Annuler</button>
              <button type="submit" className="btn-primary" data-cy="submit-status">Confirmer</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Artworks;
