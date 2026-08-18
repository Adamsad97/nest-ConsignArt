// cypress/e2e/06-loans.cy.ts
// UC 28-31 : Gestion des prêts d'œuvres

describe('UC28-31 — Prêts d\'Œuvres', () => {

  let adminToken: string;
  let artworkId: string;
  let artistId: string;
  let loanId: string;

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
      // Créer un artiste et une œuvre dispo pour le prêt
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/artists`,
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { firstName: 'Loan', lastName: 'TestArtist', bio: 'Test' },
      }).then((a) => {
        artistId = a.body.id;
        cy.request({
          method: 'POST',
          url: `${Cypress.env('apiUrl')}/artworks`,
          headers: { Authorization: `Bearer ${adminToken}` },
          body: {
            title: 'Œuvre pour Prêt',
            description: 'Test prêt E2E',
            price: 8000,
            reservePrice: 6000,
            artistId,
            medium: 'Sculpture',
            dimensions: '30x20x15cm',
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
  // UC 28 — Créer un prêt
  // ----------------------------------------------------------------
  describe('UC28 — Créer un prêt', () => {
    it('affiche le formulaire de prêt', () => {
      cy.visit('/loans');
      cy.get('[data-cy="btn-add-loan"]').click();
      cy.get('[data-cy="form-loan"]').should('be.visible');
    });

    it('crée un prêt d\'œuvre avec succès', () => {
      cy.visit('/loans');
      cy.get('[data-cy="btn-add-loan"]').click();
      cy.get('[data-cy="select-artwork"]').select(artworkId);
      cy.get('[data-cy="input-borrower"]').type('Musée d\'Art Moderne de Paris');
      cy.get('[data-cy="input-startDate"]').type('2026-09-15');
      cy.get('[data-cy="input-endDate"]').type('2026-10-15');
      cy.get('[data-cy="submit-loan"]').click();
      cy.get('[data-cy="success-message"]').should('be.visible');
    });
  });

  // ----------------------------------------------------------------
  // UC 29 — Lister les prêts
  // ----------------------------------------------------------------
  describe('UC29 — Lister les prêts', () => {
    it('affiche la liste des prêts en cours', () => {
      cy.visit('/loans');
      cy.get('[data-cy="loans-list"]').should('be.visible');
    });

    it('redirige si non connecté', () => {
      cy.clearLocalStorage();
      cy.visit('/loans');
      cy.url().should('include', '/login');
    });
  });

  // ----------------------------------------------------------------
  // UC 30 — Voir un prêt
  // ----------------------------------------------------------------
  describe('UC30 — Voir le détail d\'un prêt', () => {
    before(() => {
      // Créer un prêt pour le test
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/artworks`,
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          title: 'Œuvre Prêt Détail',
          description: 'Test',
          price: 3000,
          reservePrice: 2500,
          artistId,
          medium: 'Gravure',
          dimensions: '25x20cm',
        },
      }).then((aw) => {
        cy.request({
          method: 'POST',
          url: `${Cypress.env('apiUrl')}/loans`,
          headers: { Authorization: `Bearer ${adminToken}` },
          body: {
            artworkId: aw.body.id,
            borrowerName: 'Centre Pompidou',
            startDate: '2026-10-01',
            endDate: '2026-11-01',
          },
        }).then((loan) => {
          loanId = loan.body.id;
        });
      });
    });

    it('affiche les détails d\'un prêt spécifique', () => {
      if (!loanId) return;
      cy.visit(`/loans/${loanId}`);
      cy.get('[data-cy="loan-artwork"]').should('be.visible');
      cy.get('[data-cy="loan-borrower"]').should('be.visible');
      cy.get('[data-cy="loan-dates"]').should('be.visible');
    });
  });

  // ----------------------------------------------------------------
  // UC 31 — Marquer un prêt comme retourné
  // ----------------------------------------------------------------
  describe('UC31 — Retourner un prêt', () => {
    it('marque le prêt comme retourné', () => {
      if (!loanId) return;
      cy.visit(`/loans/${loanId}`);
      cy.get('[data-cy="btn-return-loan"]').click();
      cy.get('[data-cy="loan-status"]').should('contain', 'returned');
    });
  });
});
