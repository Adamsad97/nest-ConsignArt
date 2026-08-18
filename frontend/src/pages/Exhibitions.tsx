import React, { useEffect, useState } from 'react';
import { exhibitionService } from '../services/exhibition.service';
import { artworkService } from '../services/artwork.service';
import type { Exhibition, Artwork } from '../types';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

const Exhibitions: React.FC = () => {
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editExhibition, setEditExhibition] = useState<Exhibition | null>(null);
  const [selectedExhibition, setSelectedExhibition] = useState<Exhibition | null>(null);
  const [showAddArtworkModal, setShowAddArtworkModal] = useState(false);
  const [selectedArtworkId, setSelectedArtworkId] = useState('');
  const [form, setForm] = useState({ name: '', location: '', startDate: '', endDate: '' });

  useEffect(() => {
    load();
    loadArtworks();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await exhibitionService.getAll();
      setExhibitions(Array.isArray(res) ? res : (res as any).data ?? []);
    } catch { setError('Impossible de charger les expositions.'); }
    finally { setLoading(false); }
  };

  const loadArtworks = async () => {
    try {
      const res = await artworkService.getAll();
      const list: Artwork[] = Array.isArray(res) ? res : (res as any).data ?? [];
      setArtworks(list.filter(a => a.status === 'available'));
    } catch { /* pas bloquant */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try {
      if (editExhibition) {
        await exhibitionService.update(editExhibition.id, form);
        setSuccess('Exposition modifiée.');
      } else {
        await exhibitionService.create(form);
        setSuccess('Exposition créée.');
      }
      setShowModal(false); load();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erreur.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  const handleStart = async (id: string) => {
    try { await exhibitionService.start(id); setSuccess('Exposition démarrée.'); load(); }
    catch (err: any) { setError(err.response?.data?.message || 'Erreur.'); }
  };

  const handleClose = async (id: string) => {
    try { await exhibitionService.close(id); setSuccess('Exposition clôturée.'); load(); }
    catch (err: any) { setError(err.response?.data?.message || 'Erreur.'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette exposition ?')) return;
    try { await exhibitionService.remove(id); setSuccess('Exposition supprimée.'); load(); }
    catch { setError('Impossible de supprimer.'); }
  };

  const handleAddArtwork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExhibition || !selectedArtworkId) return;
    try {
      await exhibitionService.addArtwork(selectedExhibition.id, selectedArtworkId);
      setSuccess('Œuvre ajoutée à l\'exposition.');
      setShowAddArtworkModal(false);
      load();
    } catch (err: any) { setError(err.response?.data?.message || 'Erreur.'); }
  };

  const openCreate = () => { setEditExhibition(null); setForm({ name: '', location: '', startDate: '', endDate: '' }); setError(''); setShowModal(true); };
  const openEdit = (ex: Exhibition) => { setEditExhibition(ex); setForm({ name: ex.name, location: ex.location, startDate: ex.startDate.split('T')[0], endDate: ex.endDate.split('T')[0] }); setShowModal(true); };

  return (
    <div className="container mx-auto px-6 py-10 fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.8rem', color: 'var(--texte)' }}>Expositions</h1>
        <button className="btn-primary" data-cy="btn-add-exhibition" onClick={openCreate}>+ Créer</button>
      </div>

      {success && <div className="success-box" data-cy="success-message">{success}</div>}
      {error && <div className="error-box">{error}</div>}

      {loading ? (
        <div style={{ color: 'var(--texte-muted)', textAlign: 'center', padding: '3rem' }}>Chargement...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5" data-cy="exhibitions-list">
          {exhibitions.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', gridColumn: 'span 2' }}><p style={{ color: 'var(--texte-muted)' }}>Aucune exposition.</p></div>
          ) : exhibitions.map((ex) => (
            <div key={ex.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <h3 data-cy="exhibition-name" style={{ fontFamily: 'Georgia, serif', fontSize: '1.1rem', color: 'var(--texte)' }}>{ex.name}</h3>
                <StatusBadge status={ex.status} dataCy="exhibition-status" />
              </div>
              <p data-cy="exhibition-location" style={{ color: 'var(--texte-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>📍 {ex.location}</p>
              <p style={{ color: 'var(--texte-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                {new Date(ex.startDate).toLocaleDateString('fr-FR')} → {new Date(ex.endDate).toLocaleDateString('fr-FR')}
              </p>
              <div className="flex gap-2 flex-wrap" style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                <button onClick={() => openEdit(ex)} data-cy="btn-edit-exhibition" style={{ color: 'var(--or)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem' }}>Modifier</button>
                {ex.status === 'planned' && (
                  <button onClick={() => handleStart(ex.id)} data-cy="btn-start-exhibition" style={{ color: '#6dba87', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem' }}>Démarrer</button>
                )}
                {ex.status === 'ongoing' && (
                  <>
                    <button onClick={() => handleClose(ex.id)} data-cy="btn-close-exhibition" style={{ color: '#9a9088', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem' }}>Clôturer</button>
                    <button onClick={() => { setSelectedExhibition(ex); setShowAddArtworkModal(true); }} data-cy="btn-add-artwork-to-exhibition" style={{ color: 'var(--texte-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem' }}>+ Œuvre</button>
                  </>
                )}
                {ex.status === 'planned' && (
                  <button onClick={() => handleDelete(ex.id)} data-cy="btn-delete-exhibition" style={{ color: 'var(--rouge)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem' }}>Supprimer</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editExhibition ? 'Modifier l\'exposition' : 'Nouvelle exposition'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} data-cy="form-exhibition">
            <div className="mb-4"><label className="form-label">Nom *</label><input className="form-input" data-cy="input-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="mb-4"><label className="form-label">Lieu *</label><input className="form-input" data-cy="input-location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div><label className="form-label">Début *</label><input type="date" className="form-input" data-cy="input-startDate" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required /></div>
              <div><label className="form-label">Fin *</label><input type="date" className="form-input" data-cy="input-endDate" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required /></div>
            </div>
            {error && <div className="error-box">{error}</div>}
            <div className="flex gap-3 justify-end">
              <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>Annuler</button>
              <button type="submit" className="btn-primary" data-cy="submit-exhibition">{editExhibition ? 'Mettre à jour' : 'Créer'}</button>
            </div>
          </form>
        </Modal>
      )}

      {showAddArtworkModal && (
        <Modal title="Ajouter une œuvre" onClose={() => setShowAddArtworkModal(false)}>
          <form onSubmit={handleAddArtwork}>
            <div className="mb-6">
              <label className="form-label">Œuvre disponible</label>
              <select className="form-input" data-cy="select-artwork" value={selectedArtworkId} onChange={(e) => setSelectedArtworkId(e.target.value)} required>
                <option value="">— Choisir —</option>
                {artworks.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" className="btn-outline" onClick={() => setShowAddArtworkModal(false)}>Annuler</button>
              <button type="submit" className="btn-primary" data-cy="submit-add-artwork">Ajouter</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Exhibitions;
