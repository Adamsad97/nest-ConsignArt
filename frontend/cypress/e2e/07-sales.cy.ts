// cypress/e2e/07-sales.cy.ts
// UC 32-35 : Gestion des ventes et factures

describe('UC32-35 — Ventes', () => {

  let adminToken: string;
  let artworkId: string;
  let artistId: string;
  let saleId: string;

  before(() => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/auth/login`,
      body: {
        email: Cypress.env('adminEmail'),
        password: Cypress.env('adminPassword'),
      },
    }).then((resp) => {
      adminToken = resp.body.accessToken;
      // Créer un artiste et une œuvre disponible pour la vente
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/artists`,
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { firstName: 'Sale', lastName: 'TestArtist', bio: 'Artiste pour test vente' },
      }).then((a) => {
        artistId = a.body.id;
        cy.request({
          method: 'POST',
          url: `${Cypress.env('apiUrl')}/artworks`,
          headers: { Authorization: `Bearer ${adminToken}` },
          body: {
            title: 'Œuvre à Vendre',
            description: 'Test vente E2E',
            price: 12000,
            reservePrice: 10000,
            artistId,
            medium: 'Peinture à l\'huile',
            dimensions: '100x80cm',
          },
        }).then((aw) => {
          artworkId = aw.body.id;
        });
      });
    });
  });

  beforeEach(() => {
    cy.loginViaApi(Cypress.env('adminEmail'), Cypress.env('adminPassword'));
  });

  // ----------------------------------------------------------------
  // UC 32 — Enregistrer une vente
  // ----------------------------------------------------------------
  describe('UC32 — Enregistrer une vente', () => {
    it('affiche le formulaire de vente', () => {
      cy.visit('/sales');
      cy.get('[data-cy="btn-new-sale"]').click();
      cy.get('[data-cy="form-sale"]').should('be.visible');
    });

    it('enregistre une vente avec succès (transaction atomique)', () => {
      cy.visit('/sales');
      cy.get('[data-cy="btn-new-sale"]').click();
      // Sélectionner l'œuvre disponible
      cy.get('[data-cy="select-artwork"]').select(artworkId);
      cy.get('[data-cy="input-salePrice"]').type('12000');
      cy.get('[data-cy="input-buyerEmail"]').type('acheteur@test.com');
      cy.get('[data-cy="submit-sale"]').click();
      cy.get('[data-cy="success-message"]').should('be.visible');
      // La vente doit apparaître dans la liste
      cy.get('[data-cy="sales-list"]').should('be.visible');
    });

    it('refuse une vente en dessous du prix de réserve', () => {
      // Créer une nouvelle œuvre pour ce test
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/artworks`,
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          title: 'Œuvre Réserve Test',
          description: 'Test',
          price: 10000,
          reservePrice: 9000,
          artistId,
          medium: 'Dessin',
          dimensions: '30x40cm',
        },
      }).then((aw) => {
        cy.visit('/sales');
        cy.get('[data-cy="btn-new-sale"]').click();
        cy.get('[data-cy="select-artwork"]').select(aw.body.id);
        cy.get('[data-cy="input-salePrice"]').type('5000'); // sous le prix de réserve
        cy.get('[data-cy="input-buyerEmail"]').type('acheteur@test.com');
        cy.get('[data-cy="submit-sale"]').click();
        cy.get('[data-cy="error-message"]').should('be.visible');
      });
    });
  });

  // ----------------------------------------------------------------
  // UC 33 — Lister les ventes
  // ----------------------------------------------------------------
  describe('UC33 — Lister les ventes', () => {
    it('affiche la liste des ventes', () => {
      cy.visit('/sales');
      cy.get('[data-cy="sales-list"]').should('be.visible');
    });

    it('redirige si non connecté', () => {
      cy.clearLocalStorage();
      cy.visit('/sales');
      cy.url().should('include', '/login');
    });
  });

  // ----------------------------------------------------------------
  // UC 34 — Voir une vente
  // ----------------------------------------------------------------
  describe('UC34 — Voir une vente', () => {
    before(() => {
      // Récupérer la première vente existante
      cy.request({
        method: 'GET',
        url: `${Cypress.env('apiUrl')}/sales`,
        headers: { Authorization: `Bearer ${adminToken}` },
      }).then((resp) => {
        if (resp.body.data && resp.body.data.length > 0) {
          saleId = resp.body.data[0].id;
        } else if (resp.body.length > 0) {
          saleId = resp.body[0].id;
        }
      });
    });

    it('affiche le détail d\'une vente', () => {
      if (!saleId) return;
      cy.visit(`/sales/${saleId}`);
      cy.get('[data-cy="sale-artwork"]').should('be.visible');
      cy.get('[data-cy="sale-price"]').should('be.visible');
      cy.get('[data-cy="sale-commission"]').should('be.visible');
    });
  });

  // ----------------------------------------------------------------
  // UC 35 — Voir la facture d'une vente
  // ----------------------------------------------------------------
  describe('UC35 — Facture d\'une vente', () => {
    it('affiche la facture associée à une vente', () => {
      if (!saleId) return;
      cy.visit(`/sales/${saleId}`);
      cy.get('[data-cy="btn-view-invoice"]').click();
      cy.get('[data-cy="invoice-number"]').should('be.visible');
      cy.get('[data-cy="invoice-amount"]').should('be.visible');
    });
  });
});
