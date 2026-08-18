import React, { useEffect, useState } from 'react';
import { artistService } from '../services/artist.service';
import type { Artist } from '../types';
import Modal from '../components/Modal';

const Artists: React.FC = () => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editArtist, setEditArtist] = useState<Artist | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', bio: '' });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await artistService.getAll();
      const list = Array.isArray(res) ? res : (res as any).data ?? [];
      setArtists(list);
    } catch {
      setError('Impossible de charger les artistes.');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditArtist(null);
    setForm({ firstName: '', lastName: '', bio: '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (a: Artist) => {
    setEditArtist(a);
    setForm({ firstName: a.firstName, lastName: a.lastName, bio: a.bio ?? '' });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editArtist) {
        await artistService.update(editArtist.id, form);
        setSuccess('Artiste mis à jour.');
      } else {
        await artistService.create(form);
        setSuccess('Artiste ajouté.');
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erreur.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  const handleDeactivate = async (a: Artist) => {
    if (!window.confirm(`Désactiver ${a.firstName} ${a.lastName} ?`)) return;
    try {
      await artistService.remove(a.id);
      setSuccess('Artiste désactivé.');
      load();
    } catch { setError('Erreur lors de la désactivation.'); }
  };

  const handleActivate = async (a: Artist) => {
    try {
      await artistService.activate(a.id);
      setSuccess('Artiste réactivé.');
      load();
    } catch { setError('Erreur lors de la réactivation.'); }
  };

  return (
    <div className="container mx-auto px-6 py-10 fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.8rem', color: 'var(--texte)' }}>Artistes</h1>
          <p style={{ color: 'var(--texte-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{artists.length} artiste{artists.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" data-cy="btn-add-artist" onClick={openCreate}>+ Ajouter</button>
      </div>

      {success && <div className="success-box" data-cy="success-message">{success}</div>}
      {error && <div className="error-box">{error}</div>}

      {loading ? (
        <div style={{ color: 'var(--texte-muted)', textAlign: 'center', padding: '3rem' }}>Chargement...</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table-consignart" data-cy="artists-list">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Biographie</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {artists.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--texte-muted)', padding: '2rem' }}>Aucun artiste</td></tr>
              ) : (
                artists.map((a) => (
                  <tr key={a.id}>
                    <td data-cy="artist-name" style={{ fontWeight: 600 }}>{a.firstName} {a.lastName}</td>
                    <td data-cy="artist-bio" style={{ color: 'var(--texte-muted)', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.bio || '—'}
                    </td>
                    <td>
                      <span className={a.isActive ? 'badge badge-available' : 'badge badge-closed'}>
                        {a.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-3">
                        <button onClick={() => openEdit(a)} data-cy="btn-edit-artist" style={{ color: 'var(--or)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>
                          Modifier
                        </button>
                        {a.isActive ? (
                          <button onClick={() => handleDeactivate(a)} data-cy="btn-deactivate-artist" style={{ color: 'var(--rouge)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>
                            Désactiver
                          </button>
                        ) : (
                          <button onClick={() => handleActivate(a)} data-cy="btn-activate-artist" style={{ color: 'var(--vert)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>
                            Réactiver
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editArtist ? 'Modifier l\'artiste' : 'Nouvel artiste'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} data-cy="form-artist">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="form-label">Prénom *</label>
                <input className="form-input" data-cy="input-firstName" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              </div>
              <div>
                <label className="form-label">Nom *</label>
                <input className="form-input" data-cy="input-lastName" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              </div>
            </div>
            <div className="mb-6">
              <label className="form-label">Biographie</label>
              <textarea className="form-input" data-cy="input-bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4} />
            </div>
            {error && <div className="error-box">{error}</div>}
            <div className="flex gap-3 justify-end">
              <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>Annuler</button>
              <button type="submit" className="btn-primary" data-cy="submit-artist">
                {editArtist ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Artists;
