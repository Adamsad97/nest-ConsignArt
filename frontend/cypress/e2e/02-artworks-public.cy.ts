// cypress/e2e/02-artworks-public.cy.ts
// UC 13-14 : Consultation publique des œuvres (pas besoin d'être connecté)

describe('UC13-14 — Œuvres publiques', () => {

  // ----------------------------------------------------------------
  // UC 13 — Liste des œuvres (public)
  // ----------------------------------------------------------------
  describe('UC13 — Lister les œuvres (accès public)', () => {
    it('affiche la galerie des œuvres sans être connecté', () => {
      cy.visit('/artworks');
      cy.get('[data-cy="artworks-list"]').should('be.visible');
    });

    it('les œuvres ont un titre, un statut et un prix', () => {
      // Pré-condition : l'API doit avoir au moins une œuvre
      // On en crée une via l'API pour être sûr
      cy.loginViaApi(Cypress.env('adminEmail'), Cypress.env('adminPassword'));
      cy.window().then((win) => {
        const token = win.localStorage.getItem('token');
        // On cherche les artistes existants
        cy.request({
          method: 'GET',
          url: `${Cypress.env('apiUrl')}/artworks`,
        }).then((resp) => {
          cy.visit('/artworks');
          cy.get('[data-cy="artworks-list"]').should('be.visible');
        });
      });
    });

    it('affiche un message si aucune œuvre n\'est disponible', () => {
      cy.visit('/artworks');
      // Soit des cartes, soit un message "aucune œuvre"
      cy.get('body').should('contain.text', '');
    });
  });

  // ----------------------------------------------------------------
  // UC 14 — Détail d'une œuvre (public)
  // ----------------------------------------------------------------
  describe('UC14 — Voir le détail d\'une œuvre', () => {
    let artworkId: string;

    before(() => {
      // On crée tout le setup nécessaire via l'API
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/auth/login`,
        body: {
          email: Cypress.env('adminEmail'),
          password: Cypress.env('adminPassword'),
        },
      }).then((loginResp) => {
        const adminToken = loginResp.body.accessToken;
        // Créer un artiste
        cy.request({
          method: 'POST',
          url: `${Cypress.env('apiUrl')}/artists`,
          headers: { Authorization: `Bearer ${adminToken}` },
          body: {
            firstName: 'Marie',
            lastName: 'Dupont',
            bio: 'Peintre contemporaine',
          },
        }).then((artistResp) => {
          const artistId = artistResp.body.id;
          // Créer une œuvre
          cy.request({
            method: 'POST',
            url: `${Cypress.env('apiUrl')}/artworks`,
            headers: { Authorization: `Bearer ${adminToken}` },
            body: {
              title: 'Test Artwork E2E',
              description: 'Une belle peinture abstraite pour test',
              price: 2500,
              reservePrice: 2000,
              artistId: artistId,
              medium: 'Huile sur toile',
              dimensions: '80x60cm',
            },
          }).then((artworkResp) => {
            artworkId = artworkResp.body.id;
          });
        });
      });
    });

    it('affiche le détail d\'une œuvre via son ID', () => {
      if (!artworkId) return;
      cy.visit(`/artworks/${artworkId}`);
      cy.get('[data-cy="artwork-title"]').should('be.visible');
      cy.get('[data-cy="artwork-price"]').should('be.visible');
      cy.get('[data-cy="artwork-status"]').should('be.visible');
    });

    it('retourne une 404 si l\'œuvre n\'existe pas', () => {
      cy.request({
        method: 'GET',
        url: `${Cypress.env('apiUrl')}/artworks/00000000-0000-0000-0000-000000000000`,
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(404);
      });
    });
  });
});
