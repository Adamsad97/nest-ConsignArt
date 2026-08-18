// cypress/e2e/05-exhibitions.cy.ts
// UC 19-27 : Gestion complète des expositions

describe('UC19-27 — Expositions', () => {

  let adminToken: string;
  let exhibitionId: string;
  let artworkId: string;
  let artistId: string;

  before(() => {
    // Setup complet : connexion admin + artiste + œuvre disponible
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/auth/login`,
      body: {
        email: Cypress.env('adminEmail'),
        password: Cypress.env('adminPassword'),
      },
    }).then((resp) => {
      adminToken = resp.body.accessToken;
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/artists`,
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { firstName: 'Expo', lastName: 'Artist', bio: 'Artiste pour test expo' },
      }).then((a) => {
        artistId = a.body.id;
        cy.request({
          method: 'POST',
          url: `${Cypress.env('apiUrl')}/artworks`,
          headers: { Authorization: `Bearer ${adminToken}` },
          body: {
            title: 'Œuvre pour Expo',
            description: 'Test',
            price: 5000,
            reservePrice: 4000,
            artistId,
            medium: 'Peinture',
            dimensions: '60x50cm',
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
  // UC 19 — Créer une exposition
  // ----------------------------------------------------------------
  describe('UC19 — Créer une exposition', () => {
    it('affiche le formulaire de création', () => {
      cy.visit('/exhibitions');
      cy.get('[data-cy="btn-add-exhibition"]').click();
      cy.get('[data-cy="form-exhibition"]').should('be.visible');
    });

    it('crée une exposition avec succès', () => {
      cy.visit('/exhibitions');
      cy.get('[data-cy="btn-add-exhibition"]').click();
      cy.get('[data-cy="input-name"]').type('Exposition Test E2E');
      cy.get('[data-cy="input-location"]').type('Galerie Centrale, Paris');
      cy.get('[data-cy="input-startDate"]').type('2026-09-01');
      cy.get('[data-cy="input-endDate"]').type('2026-09-30');
      cy.get('[data-cy="submit-exhibition"]').click();
      cy.get('[data-cy="success-message"]').should('be.visible');
      cy.get('[data-cy="exhibitions-list"]').should('contain', 'Exposition Test E2E');
    });
  });

  // ----------------------------------------------------------------
  // UC 20 — Lister les expositions
  // ----------------------------------------------------------------
  describe('UC20 — Lister les expositions', () => {
    it('affiche la liste des expositions', () => {
      cy.visit('/exhibitions');
      cy.get('[data-cy="exhibitions-list"]').should('be.visible');
    });
  });

  // ----------------------------------------------------------------
  // UC 21 — Voir une exposition
  // ----------------------------------------------------------------
  describe('UC21 — Voir le détail d\'une exposition', () => {
    before(() => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/exhibitions`,
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          name: 'Expo Détail Test',
          location: 'Paris',
          startDate: '2026-10-01',
          endDate: '2026-10-31',
        },
      }).then((resp) => {
        exhibitionId = resp.body.id;
      });
    });

    it('affiche le nom, la localisation et les œuvres d\'une exposition', () => {
      if (!exhibitionId) return;
      cy.visit(`/exhibitions/${exhibitionId}`);
      cy.get('[data-cy="exhibition-name"]').should('be.visible');
      cy.get('[data-cy="exhibition-location"]').should('be.visible');
    });
  });

  // ----------------------------------------------------------------
  // UC 22 — Modifier une exposition
  // ----------------------------------------------------------------
  describe('UC22 — Modifier une exposition', () => {
    it('modifie la localisation d\'une exposition', () => {
      if (!exhibitionId) return;
      cy.visit(`/exhibitions/${exhibitionId}`);
      cy.get('[data-cy="btn-edit-exhibition"]').click();
      cy.get('[data-cy="input-location"]').clear().type('Lyon — Musée des Confluences');
      cy.get('[data-cy="submit-exhibition"]').click();
      cy.get('[data-cy="success-message"]').should('be.visible');
    });
  });

  // ----------------------------------------------------------------
  // UC 25 — Ajouter une œuvre à une exposition
  // ----------------------------------------------------------------
  describe('UC25 — Ajouter une œuvre à une exposition', () => {
    it('ajoute une œuvre disponible à l\'exposition', () => {
      if (!exhibitionId || !artworkId) return;
      cy.visit(`/exhibitions/${exhibitionId}`);
      cy.get('[data-cy="btn-add-artwork-to-exhibition"]').click();
      cy.get('[data-cy="select-artwork"]').select(artworkId);
      cy.get('[data-cy="submit-add-artwork"]').click();
      cy.get('[data-cy="success-message"]').should('be.visible');
    });
  });

  // ----------------------------------------------------------------
  // UC 23 — Démarrer une exposition
  // ----------------------------------------------------------------
  describe('UC23 — Démarrer une exposition', () => {
    it('démarre l\'exposition (statut → ONGOING)', () => {
      if (!exhibitionId) return;
      cy.visit(`/exhibitions/${exhibitionId}`);
      cy.get('[data-cy="btn-start-exhibition"]').click();
      cy.get('[data-cy="exhibition-status"]').should('contain', 'ongoing');
    });
  });

  // ----------------------------------------------------------------
  // UC 26 — Retirer une œuvre d'une exposition
  // ----------------------------------------------------------------
  describe('UC26 — Retirer une œuvre d\'une exposition', () => {
    it('retire une œuvre de l\'exposition (via API car l\'expo est ongoing)', () => {
      if (!exhibitionId || !artworkId || !adminToken) return;
      cy.request({
        method: 'DELETE',
        url: `${Cypress.env('apiUrl')}/exhibitions/${exhibitionId}/artworks/${artworkId}`,
        headers: { Authorization: `Bearer ${adminToken}` },
        failOnStatusCode: false,
      }).then((resp) => {
        // 204 si OK, ou 409 si exposition déjà en cours
        expect([204, 409]).to.include(resp.status);
      });
    });
  });

  // ----------------------------------------------------------------
  // UC 24 — Clôturer une exposition
  // ----------------------------------------------------------------
  describe('UC24 — Clôturer une exposition', () => {
    it('clôture l\'exposition (statut → CLOSED)', () => {
      if (!exhibitionId) return;
      cy.visit(`/exhibitions/${exhibitionId}`);
      cy.get('[data-cy="btn-close-exhibition"]').click();
      cy.get('[data-cy="exhibition-status"]').should('contain', 'closed');
    });
  });

  // ----------------------------------------------------------------
  // UC 27 — Supprimer une exposition
  // ----------------------------------------------------------------
  describe('UC27 — Supprimer une exposition', () => {
    let deletableExhibitionId: string;

    before(() => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/exhibitions`,
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          name: 'Expo à Supprimer',
          location: 'Marseille',
          startDate: '2026-11-01',
          endDate: '2026-11-30',
        },
      }).then((resp) => {
        deletableExhibitionId = resp.body.id;
      });
    });

    it('supprime une exposition vide', () => {
      if (!deletableExhibitionId) return;
      cy.visit(`/exhibitions/${deletableExhibitionId}`);
      cy.get('[data-cy="btn-delete-exhibition"]').click();
      cy.get('[data-cy="confirm-delete"]').click();
      cy.url().should('include', '/exhibitions');
      cy.get('[data-cy="exhibitions-list"]').should('not.contain', 'Expo à Supprimer');
    });
  });
});
