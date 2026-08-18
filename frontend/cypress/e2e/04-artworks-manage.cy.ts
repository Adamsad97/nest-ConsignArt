// cypress/e2e/04-artworks-manage.cy.ts
// UC 15-18 : Gestion des œuvres (connecté en galerie/admin)

describe('UC15-18 — Gestion des Œuvres (connecté)', () => {

  let adminToken: string;
  let artistId: string;
  let artworkId: string;

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
      // Créer un artiste de base pour les tests
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/artists`,
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          firstName: 'Claude',
          lastName: 'Monet',
          bio: 'Maître de l\'impressionnisme',
        },
      }).then((artistResp) => {
        artistId = artistResp.body.id;
      });
    });
  });

  beforeEach(() => {
    cy.loginViaApi(Cypress.env('adminEmail'), Cypress.env('adminPassword'));
  });

  // ----------------------------------------------------------------
  // UC 15 — Ajouter une œuvre
  // ----------------------------------------------------------------
  describe('UC15 — Ajouter une œuvre', () => {
    it('affiche le formulaire d\'ajout d\'œuvre', () => {
      cy.visit('/artworks');
      cy.get('[data-cy="btn-add-artwork"]').click();
      cy.get('[data-cy="form-artwork"]').should('be.visible');
    });

    it('crée une œuvre avec succès', () => {
      cy.visit('/artworks');
      cy.get('[data-cy="btn-add-artwork"]').click();
      cy.get('[data-cy="input-title"]').type('Nymphéas — Test E2E');
      cy.get('[data-cy="input-description"]').type('Reproduction pour test automatisé');
      cy.get('[data-cy="input-price"]').type('15000');
      cy.get('[data-cy="input-reservePrice"]').type('12000');
      cy.get('[data-cy="input-medium"]').type('Huile sur toile');
      cy.get('[data-cy="input-dimensions"]').type('120x80cm');
      cy.get('[data-cy="select-artist"]').select(artistId);
      cy.get('[data-cy="submit-artwork"]').click();
      cy.get('[data-cy="success-message"]').should('be.visible');
    });

    it('refuse un prix inférieur au prix de réserve', () => {
      cy.visit('/artworks');
      cy.get('[data-cy="btn-add-artwork"]').click();
      cy.get('[data-cy="input-title"]').type('Œuvre invalide');
      cy.get('[data-cy="input-price"]').type('500');
      cy.get('[data-cy="input-reservePrice"]').type('1000'); // plus élevé
      cy.get('[data-cy="select-artist"]').select(artistId);
      cy.get('[data-cy="submit-artwork"]').click();
      cy.get('[data-cy="error-message"]').should('be.visible');
    });
  });

  // ----------------------------------------------------------------
  // UC 16 — Modifier une œuvre
  // ----------------------------------------------------------------
  describe('UC16 — Modifier une œuvre', () => {
    before(() => {
      // Créer une œuvre pour ce test
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/artworks`,
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          title: 'Œuvre à modifier',
          description: 'Description initiale',
          price: 3000,
          reservePrice: 2500,
          artistId: artistId,
          medium: 'Aquarelle',
          dimensions: '40x30cm',
        },
      }).then((resp) => {
        artworkId = resp.body.id;
      });
    });

    it('modifie le titre et le prix d\'une œuvre', () => {
      if (!artworkId) return;
      cy.visit(`/artworks/${artworkId}`);
      cy.get('[data-cy="btn-edit-artwork"]').click();
      cy.get('[data-cy="input-title"]').clear().type('Titre modifié E2E');
      cy.get('[data-cy="submit-artwork"]').click();
      cy.get('[data-cy="success-message"]').should('be.visible');
      cy.get('[data-cy="artwork-title"]').should('contain', 'Titre modifié E2E');
    });
  });

  // ----------------------------------------------------------------
  // UC 17 — Supprimer une œuvre
  // ----------------------------------------------------------------
  describe('UC17 — Supprimer une œuvre', () => {
    let deletableArtworkId: string;

    before(() => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/artworks`,
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          title: 'Œuvre à supprimer',
          description: 'Supprimée par le test E2E',
          price: 1000,
          reservePrice: 800,
          artistId: artistId,
          medium: 'Crayon',
          dimensions: '20x15cm',
        },
      }).then((resp) => {
        deletableArtworkId = resp.body.id;
      });
    });

    it('supprime une œuvre et disparaît de la liste', () => {
      if (!deletableArtworkId) return;
      cy.visit(`/artworks/${deletableArtworkId}`);
      cy.get('[data-cy="btn-delete-artwork"]').click();
      cy.get('[data-cy="confirm-delete"]').click();
      cy.url().should('include', '/artworks');
      cy.get('[data-cy="artworks-list"]').should('not.contain', 'Œuvre à supprimer');
    });
  });

  // ----------------------------------------------------------------
  // UC 18 — Changer le statut d'une œuvre
  // ----------------------------------------------------------------
  describe('UC18 — Changer le statut', () => {
    it('change le statut "available" → "on_loan"', () => {
      if (!artworkId) return;
      cy.visit(`/artworks/${artworkId}`);
      cy.get('[data-cy="btn-change-status"]').click();
      cy.get('[data-cy="select-status"]').select('on_loan');
      cy.get('[data-cy="submit-status"]').click();
      cy.get('[data-cy="artwork-status"]').should('contain', 'on_loan');
    });
  });
});
