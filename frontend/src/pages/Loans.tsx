import React, { useEffect, useState } from 'react';
import { loanService } from '../services/loan.service';
import { artworkService } from '../services/artwork.service';
import type { Loan, Artwork } from '../types';
import Modal from '../components/Modal';

const Loans: React.FC = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ artworkId: '', borrowerName: '', startDate: '', endDate: '' });

  useEffect(() => { load(); loadArtworks(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await loanService.getAll();
      setLoans(Array.isArray(res) ? res : (res as any).data ?? []);
    } catch { setError('Impossible de charger les prêts.'); }
    finally { setLoading(false); }
  };

  const loadArtworks = async () => {
    try {
      const res = await artworkService.getAll();
      const list: Artwork[] = Array.isArray(res) ? res : (res as any).data ?? [];
      setArtworks(list.filter(a => a.status === 'available'));
    } catch { /* pas bloquant */ }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try {
      await loanService.create(form);
      setSuccess('Prêt enregistré.');
      setShowModal(false);
      setForm({ artworkId: '', borrowerName: '', startDate: '', endDate: '' });
      load();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erreur.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  const handleReturn = async (id: string) => {
    try {
      await loanService.returnLoan(id);
      setSuccess('Prêt marqué comme retourné.');
      load();
    } catch { setError('Erreur lors du retour.'); }
  };

  return (
    <div className="container mx-auto px-6 py-10 fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.8rem', color: 'var(--texte)' }}>Prêts d&apos;œuvres</h1>
        <button className="btn-primary" data-cy="btn-add-loan" onClick={() => setShowModal(true)}>+ Nouveau prêt</button>
      </div>

      {success && <div className="success-box" data-cy="success-message">{success}</div>}
      {error && <div className="error-box">{error}</div>}

      {loading ? (
        <div style={{ color: 'var(--texte-muted)', textAlign: 'center', padding: '3rem' }}>Chargement...</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table-consignart" data-cy="loans-list">
            <thead>
              <tr>
                <th>Œuvre</th>
                <th>Emprunteur</th>
                <th>Période</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loans.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--texte-muted)', padding: '2rem' }}>Aucun prêt</td></tr>
              ) : loans.map((loan) => (
                <tr key={loan.id}>
                  <td data-cy="loan-artwork" style={{ fontWeight: 600 }}>{loan.artwork?.title ?? loan.artworkId}</td>
                  <td data-cy="loan-borrower">{loan.borrowerName}</td>
                  <td data-cy="loan-dates" style={{ color: 'var(--texte-muted)', fontSize: '0.8rem' }}>
                    {new Date(loan.startDate).toLocaleDateString('fr-FR')} → {new Date(loan.endDate).toLocaleDateString('fr-FR')}
                  </td>
                  <td data-cy="loan-status">
                    <span className={loan.returnedAt ? 'badge badge-returned' : 'badge badge-on_loan'}>
                      {loan.returnedAt ? 'Retourné' : 'En cours'}
                    </span>
                  </td>
                  <td>
                    {!loan.returnedAt && (
                      <button onClick={() => handleReturn(loan.id)} data-cy="btn-return-loan" style={{ color: 'var(--or)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>
                        Marquer retourné
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title="Nouveau prêt" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate} data-cy="form-loan">
            <div className="mb-4">
              <label className="form-label">Œuvre *</label>
              <select className="form-input" data-cy="select-artwork" value={form.artworkId} onChange={(e) => setForm({ ...form, artworkId: e.target.value })} required>
                <option value="">— Choisir —</option>
                {artworks.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
            </div>
            <div className="mb-4">
              <label className="form-label">Emprunteur *</label>
              <input className="form-input" data-cy="input-borrower" value={form.borrowerName} onChange={(e) => setForm({ ...form, borrowerName: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div><label className="form-label">Début *</label><input type="date" className="form-input" data-cy="input-startDate" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required /></div>
              <div><label className="form-label">Fin *</label><input type="date" className="form-input" data-cy="input-endDate" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required /></div>
            </div>
            {error && <div className="error-box">{error}</div>}
            <div className="flex gap-3 justify-end">
              <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>Annuler</button>
              <button type="submit" className="btn-primary" data-cy="submit-loan">Enregistrer</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Loans;
