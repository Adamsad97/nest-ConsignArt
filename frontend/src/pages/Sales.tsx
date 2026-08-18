import React, { useEffect, useState } from 'react';
import { saleService } from '../services/sale.service';
import { artworkService } from '../services/artwork.service';
import type { Sale, Artwork } from '../types';
import Modal from '../components/Modal';

const Sales: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [form, setForm] = useState({ artworkId: '', salePrice: '', buyerEmail: '' });

  useEffect(() => { load(); loadArtworks(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await saleService.getAll();
      setSales(Array.isArray(res) ? res : (res as any).data ?? []);
    } catch { setError('Impossible de charger les ventes.'); }
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
      await saleService.create({ artworkId: form.artworkId, salePrice: Number(form.salePrice), buyerEmail: form.buyerEmail || undefined });
      setSuccess('Vente enregistrée avec succès.');
      setShowModal(false);
      setForm({ artworkId: '', salePrice: '', buyerEmail: '' });
      load(); loadArtworks();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erreur lors de la vente.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  const viewInvoice = async (saleId: string) => {
    try {
      const inv = await saleService.getInvoice(saleId);
      setInvoiceData(inv);
    } catch { setError('Impossible de charger la facture.'); }
  };

  return (
    <div className="container mx-auto px-6 py-10 fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.8rem', color: 'var(--texte)' }}>Ventes</h1>
        <button className="btn-primary" data-cy="btn-new-sale" onClick={() => setShowModal(true)}>+ Enregistrer une vente</button>
      </div>

      {success && <div className="success-box" data-cy="success-message">{success}</div>}
      {error && <div className="error-box" data-cy="error-message">{error}</div>}

      {loading ? (
        <div style={{ color: 'var(--texte-muted)', textAlign: 'center', padding: '3rem' }}>Chargement...</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table-consignart" data-cy="sales-list">
            <thead>
              <tr>
                <th>Œuvre</th>
                <th>Prix de vente</th>
                <th>Commission</th>
                <th>Montant artiste</th>
                <th>Date</th>
                <th>Facture</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--texte-muted)', padding: '2rem' }}>Aucune vente</td></tr>
              ) : sales.map((sale) => (
                <tr key={sale.id}>
                  <td data-cy="sale-artwork" style={{ fontWeight: 600 }}>{sale.artwork?.title ?? sale.artworkId}</td>
                  <td data-cy="sale-price" style={{ color: 'var(--or)', fontWeight: 700 }}>{Number(sale.salePrice).toLocaleString('fr-FR')} €</td>
                  <td data-cy="sale-commission" style={{ color: 'var(--texte-muted)' }}>{Number(sale.commission).toLocaleString('fr-FR')} €</td>
                  <td style={{ color: '#6dba87' }}>{Number(sale.artistAmount).toLocaleString('fr-FR')} €</td>
                  <td style={{ color: 'var(--texte-muted)', fontSize: '0.8rem' }}>
                    {sale.soldAt ? new Date(sale.soldAt).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td>
                    <button onClick={() => viewInvoice(sale.id)} data-cy="btn-view-invoice" style={{ color: 'var(--or)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>
                      Facture →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal vente */}
      {showModal && (
        <Modal title="Enregistrer une vente" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate} data-cy="form-sale">
            <div className="mb-4">
              <label className="form-label">Œuvre *</label>
              <select className="form-input" data-cy="select-artwork" value={form.artworkId} onChange={(e) => setForm({ ...form, artworkId: e.target.value })} required>
                <option value="">— Choisir une œuvre disponible —</option>
                {artworks.map((a) => <option key={a.id} value={a.id}>{a.title} — {Number(a.price).toLocaleString('fr-FR')} €</option>)}
              </select>
            </div>
            <div className="mb-4">
              <label className="form-label">Prix de vente (€) *</label>
              <input type="number" className="form-input" data-cy="input-salePrice" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} required min="0" />
            </div>
            <div className="mb-6">
              <label className="form-label">Email de l&apos;acheteur</label>
              <input type="email" className="form-input" data-cy="input-buyerEmail" value={form.buyerEmail} onChange={(e) => setForm({ ...form, buyerEmail: e.target.value })} />
            </div>
            {error && <div className="error-box">{error}</div>}
            <div className="flex gap-3 justify-end">
              <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>Annuler</button>
              <button type="submit" className="btn-primary" data-cy="submit-sale">Valider la vente</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal facture */}
      {invoiceData && (
        <Modal title="Facture" onClose={() => setInvoiceData(null)}>
          <div>
            <p style={{ color: 'var(--texte-muted)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
              Document officiel de vente
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="form-label">N° Facture</p>
                <p data-cy="invoice-number" style={{ color: 'var(--texte)', fontWeight: 600 }}>{invoiceData.invoiceNumber}</p>
              </div>
              <div>
                <p className="form-label">Montant total</p>
                <p data-cy="invoice-amount" style={{ color: 'var(--or)', fontWeight: 700, fontSize: '1.2rem' }}>
                  {Number(invoiceData.totalAmount).toLocaleString('fr-FR')} €
                </p>
              </div>
              <div>
                <p className="form-label">Date d&apos;émission</p>
                <p style={{ color: 'var(--texte-muted)' }}>{invoiceData.issuedAt ? new Date(invoiceData.issuedAt).toLocaleDateString('fr-FR') : '—'}</p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Sales;
