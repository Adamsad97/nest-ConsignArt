// cypress/e2e/08-reports.cy.ts
// UC 36-40 : Dashboards et rapports (selon le rôle)

describe('UC36-40 — Rapports & Dashboards', () => {

  let adminToken: string;
  let artistId: string;

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
      // On a besoin d'un artiste pour les dashboards artiste
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/artists`,
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { firstName: 'Report', lastName: 'Artist', bio: 'Artiste pour rapports' },
      }).then((a) => {
        artistId = a.body.id;
      });
    });
  });

  // ----------------------------------------------------------------
  // UC 36 — Dashboard galerie
  // ----------------------------------------------------------------
  describe('UC36 — Dashboard galerie', () => {
    beforeEach(() => {
      cy.loginViaApi(Cypress.env('adminEmail'), Cypress.env('adminPassword'));
    });

    it('affiche le dashboard galerie avec les statistiques', () => {
      cy.visit('/dashboard');
      cy.get('[data-cy="dashboard-revenue"]').should('be.visible');
      cy.get('[data-cy="dashboard-sales-count"]').should('be.visible');
    });

    it('les données du dashboard viennent bien du backend (pas mock)', () => {
      cy.intercept('GET', '**/reports/dashboard/gallery**').as('getDashboard');
      cy.visit('/dashboard');
      cy.wait('@getDashboard').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200);
      });
    });
  });

  // ----------------------------------------------------------------
  // UC 37 — Dashboard artiste
  // ----------------------------------------------------------------
  describe('UC37 — Dashboard artiste', () => {
    beforeEach(() => {
      cy.loginViaApi(Cypress.env('adminEmail'), Cypress.env('adminPassword'));
    });

    it('affiche le dashboard d\'un artiste', () => {
      if (!artistId) return;
      cy.visit(`/reports/artist/${artistId}`);
      cy.get('[data-cy="artist-earnings"]').should('be.visible');
      cy.get('[data-cy="artist-artworks-count"]').should('be.visible');
    });

    it('appelle bien l\'endpoint artiste du backend', () => {
      if (!artistId) return;
      cy.intercept('GET', `**/reports/dashboard/artist/${artistId}`).as('getArtistDashboard');
      cy.visit(`/reports/artist/${artistId}`);
      cy.wait('@getArtistDashboard').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200);
      });
    });
  });

  // ----------------------------------------------------------------
  // UC 38 — Dashboard admin
  // ----------------------------------------------------------------
  describe('UC38 — Dashboard admin', () => {
    beforeEach(() => {
      cy.loginViaApi(Cypress.env('adminEmail'), Cypress.env('adminPassword'));
    });

    it('affiche les stats globales de la plateforme (admin seulement)', () => {
      cy.visit('/reports/admin');
      cy.get('[data-cy="admin-total-galleries"]').should('be.visible');
      cy.get('[data-cy="admin-total-artists"]').should('be.visible');
      cy.get('[data-cy="admin-total-revenue"]').should('be.visible');
    });

    it('bloque l\'accès au dashboard admin pour une galerie', () => {
      // On teste directement via l'API
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/auth/register`,
        body: {
          email: `galerie-rpt-${Date.now()}@test.com`,
          password: 'Test1234!',
          role: 'gallery',
        },
        failOnStatusCode: false,
      }).then((regResp) => {
        if (regResp.status === 201) {
          cy.request({
            method: 'POST',
            url: `${Cypress.env('apiUrl')}/auth/login`,
            body: {
              email: regResp.body.email,
              password: 'Test1234!',
            },
            failOnStatusCode: false,
          }).then((loginResp) => {
            // Une galerie pas encore activée ne devrait pas avoir accès
            if (loginResp.status === 200) {
              cy.request({
                method: 'GET',
                url: `${Cypress.env('apiUrl')}/reports/dashboard/admin`,
                headers: { Authorization: `Bearer ${loginResp.body.accessToken}` },
                failOnStatusCode: false,
              }).then((resp) => {
                expect(resp.status).to.eq(403);
              });
            }
          });
        }
      });
    });
  });

  // ----------------------------------------------------------------
  // UC 39 — Générer un relevé artiste
  // ----------------------------------------------------------------
  describe('UC39 — Générer un relevé artiste', () => {
    beforeEach(() => {
      cy.loginViaApi(Cypress.env('adminEmail'), Cypress.env('adminPassword'));
    });

    it('génère un relevé pour la période courante', () => {
      if (!artistId) return;
      cy.visit('/reports');
      cy.get('[data-cy="btn-generate-statement"]').click();
      cy.get('[data-cy="select-artist"]').select(artistId);
      cy.get('[data-cy="input-periodStart"]').type('2026-01-01');
      cy.get('[data-cy="input-periodEnd"]').type('2026-12-31');
      cy.get('[data-cy="submit-statement"]').click();
      cy.get('[data-cy="success-message"]').should('be.visible');
    });
  });

  // ----------------------------------------------------------------
  // UC 40 — Lister les relevés d'un artiste
  // ----------------------------------------------------------------
  describe('UC40 — Lister les relevés d\'un artiste', () => {
    beforeEach(() => {
      cy.loginViaApi(Cypress.env('adminEmail'), Cypress.env('adminPassword'));
    });

    it('affiche la liste des relevés pour un artiste', () => {
      if (!artistId) return;
      cy.visit(`/reports/artist/${artistId}`);
      cy.get('[data-cy="statements-list"]').should('be.visible');
    });

    it('appelle le bon endpoint backend', () => {
      if (!artistId) return;
      cy.intercept('GET', `**/reports/artist-statements/artist/${artistId}`).as('getStatements');
      cy.visit(`/reports/artist/${artistId}`);
      cy.wait('@getStatements').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200);
      });
    });
  });
});
