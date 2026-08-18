// cypress/e2e/09-access-control.cy.ts
// Tests de contrôle d'accès : vérification que les routes sont protégées par rôle

describe('Contrôle d\'accès — Routes protégées', () => {

  // ----------------------------------------------------------------
  // Routes qui requièrent une connexion
  // ----------------------------------------------------------------
  describe('Redirection si non connecté', () => {
    const protectedRoutes = [
      '/dashboard',
      '/artists',
      '/exhibitions',
      '/loans',
      '/sales',
      '/reports',
    ];

    protectedRoutes.forEach((route) => {
      it(`redirige /login si on accède à ${route} sans token`, () => {
        cy.clearLocalStorage();
        cy.visit(route);
        cy.url().should('include', '/login');
      });
    });
  });

  // ----------------------------------------------------------------
  // Routes publiques accessibles sans connexion
  // ----------------------------------------------------------------
  describe('Routes publiques', () => {
    it('/artworks est accessible sans connexion', () => {
      cy.clearLocalStorage();
      cy.visit('/artworks');
      cy.url().should('include', '/artworks');
      cy.get('[data-cy="artworks-list"]').should('be.visible');
    });

    it('/login est accessible sans connexion', () => {
      cy.clearLocalStorage();
      cy.visit('/login');
      cy.url().should('include', '/login');
    });

    it('/register est accessible sans connexion', () => {
      cy.clearLocalStorage();
      cy.visit('/register');
      cy.url().should('include', '/register');
    });
  });

  // ----------------------------------------------------------------
  // Restrictions par rôle (vérifiées via API)
  // ----------------------------------------------------------------
  describe('Restrictions par rôle — API', () => {
    let adminToken: string;

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
      });
    });

    it('un collector ne peut pas créer une exposition', () => {
      const email = `collector-${Date.now()}@test.com`;
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/auth/register`,
        body: { email, password: 'Test1234!', role: 'collector' },
        failOnStatusCode: false,
      }).then((reg) => {
        if (reg.status !== 201) return;
        cy.request({
          method: 'POST',
          url: `${Cypress.env('apiUrl')}/auth/login`,
          body: { email, password: 'Test1234!' },
          failOnStatusCode: false,
        }).then((login) => {
          if (login.status !== 200) return;
          cy.request({
            method: 'POST',
            url: `${Cypress.env('apiUrl')}/exhibitions`,
            headers: { Authorization: `Bearer ${login.body.accessToken}` },
            body: {
              name: 'Expo Collecteur',
              location: 'Paris',
              startDate: '2026-12-01',
              endDate: '2026-12-31',
            },
            failOnStatusCode: false,
          }).then((resp) => {
            expect(resp.status).to.eq(403);
          });
        });
      });
    });

    it('un artiste ne peut pas créer d\'artiste', () => {
      const email = `artist-${Date.now()}@test.com`;
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/auth/register`,
        body: { email, password: 'Test1234!', role: 'artist' },
        failOnStatusCode: false,
      }).then((reg) => {
        if (reg.status !== 201) return;
        cy.request({
          method: 'POST',
          url: `${Cypress.env('apiUrl')}/auth/login`,
          body: { email, password: 'Test1234!' },
          failOnStatusCode: false,
        }).then((login) => {
          if (login.status !== 200) return;
          cy.request({
            method: 'POST',
            url: `${Cypress.env('apiUrl')}/artists`,
            headers: { Authorization: `Bearer ${login.body.accessToken}` },
            body: { firstName: 'Test', lastName: 'Artiste', bio: 'Test' },
            failOnStatusCode: false,
          }).then((resp) => {
            expect(resp.status).to.eq(403);
          });
        });
      });
    });
  });
});
