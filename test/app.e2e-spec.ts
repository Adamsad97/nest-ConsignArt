import { Test, TestingModule } from '@nestjs/testing';
import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { BusinessRuleViolationFilter } from '../src/common/filters/business-rule-violation.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';

describe('ConsignArt API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(
      new GlobalExceptionFilter(),
      new BusinessRuleViolationFilter(),
    );
    app.useGlobalInterceptors(
      new LoggingInterceptor(),
      new ResponseInterceptor(),
      new ClassSerializerInterceptor(app.get(Reflector)),
    );
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1 returns basic API information', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1').expect(200);
    expect(res.body.data).toEqual({
      name: 'ConsignArt API',
      version: '1.0',
      docs: '/api/docs',
    });
  });

  it('rejects a protected route with no token', async () => {
    await request(app.getHttpServer()).get('/api/v1/users').expect(401);
  });

  describe('gallery onboarding and artwork consignment flow', () => {
    const suffix = Date.now();
    const galleryEmail = `gallery-${suffix}@test.com`;
    const adminEmail = `admin-${suffix}@test.com`;
    const password = 'Password123!';

    let adminToken: string;
    let galleryToken: string;
    let galleryUserId: string;
    let artistId: string;
    let artworkId: string;

    it('registers a gallery account as inactive', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: galleryEmail,
          password,
          firstName: 'Galerie',
          lastName: 'Moderne',
          role: 'gallery',
        })
        .expect(201);

      galleryUserId = res.body.data.id;
      expect(res.body.data.isActive).toBe(false);
    });

    it('refuses login for the inactive gallery', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: galleryEmail, password })
        .expect(401);
    });

    it('registers and logs in an admin account (active immediately)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: adminEmail,
          password,
          firstName: 'Admin',
          lastName: 'ConsignArt',
          role: 'admin',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: adminEmail, password })
        .expect(200);

      adminToken = res.body.data.access_token;
    });

    it('lets the admin activate the gallery, which can then log in', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${galleryUserId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: galleryEmail, password })
        .expect(200);

      galleryToken = res.body.data.access_token;
    });

    it('lets the gallery register an artist', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/artists')
        .set('Authorization', `Bearer ${galleryToken}`)
        .send({ firstName: 'Frida', lastName: 'Kahlo', nationality: 'Mexican' })
        .expect(201);

      artistId = res.body.data.id;
    });

    it('creates an artwork and normalizes price/reservePrice to 2 decimals', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/artworks')
        .set('Authorization', `Bearer ${galleryToken}`)
        .send({
          title: 'Self-Portrait',
          artistId,
          price: 1500.256,
          reservePrice: 1000.994,
        })
        .expect(201);

      artworkId = res.body.data.id;
      expect(res.body.data.price).toBe(1500.26);
      expect(res.body.data.reservePrice).toBe(1000.99);
    });

    it('lists the new artwork in the public catalog', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/artworks')
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(
        res.body.data.some(
          (a: { title: string }) => a.title === 'Self-Portrait',
        ),
      ).toBe(true);
    });

    it('rejects a sale below the reserve price', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${galleryToken}`)
        .send({
          artworkId,
          buyer: 'Jean Dupont',
          buyerContact: 'jean@test.com',
          salePrice: 500,
        })
        .expect(422);

      expect(res.body.rule).toBe('BELOW_RESERVE_PRICE');
    });

    it('processes a sale with the correct commission tier and invoice, and updates the artwork status', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${galleryToken}`)
        .send({
          artworkId,
          buyer: 'Jean Dupont',
          buyerContact: 'jean@test.com',
          salePrice: 1500.26,
        })
        .expect(201);

      expect(res.body.data.commissionRate).toBe(0.4);
      expect(res.body.data.galleryCommission).toBe(600.1);
      expect(res.body.data.artistAmount).toBe(900.16);
      expect(res.body.data.invoice.invoiceNumber).toMatch(/^INV-/);
      expect(res.body.data.artwork.status).toBe('sold');

      const artworkRes = await request(app.getHttpServer())
        .get(`/api/v1/artworks/${artworkId}`)
        .expect(200);
      expect(artworkRes.body.data.status).toBe('sold');
    });

    it('refuses a second sale of the same artwork now that it is sold', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${galleryToken}`)
        .send({
          artworkId,
          buyer: 'Someone Else',
          buyerContact: 'someone@test.com',
          salePrice: 1500.26,
        })
        .expect(422);
    });

    it('refuses another gallery from updating the artist it does not own', async () => {
      const otherGalleryEmail = `gallery2-${suffix}@test.com`;
      const registerRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: otherGalleryEmail,
          password,
          firstName: 'Autre',
          lastName: 'Galerie',
          role: 'gallery',
        })
        .expect(201);
      const otherGalleryUserId = registerRes.body.data.id;

      await request(app.getHttpServer())
        .patch(`/api/v1/users/${otherGalleryUserId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: otherGalleryEmail, password })
        .expect(200);
      const otherToken = loginRes.body.data.access_token;

      await request(app.getHttpServer())
        .patch(`/api/v1/artists/${artistId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ bio: 'Attempted takeover' })
        .expect(403);
    });
  });
});
