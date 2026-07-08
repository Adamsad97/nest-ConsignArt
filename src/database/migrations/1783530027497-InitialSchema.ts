import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1783530027497 implements MigrationInterface {
  name = 'InitialSchema1783530027497';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."artwork_status_history_previousstatus_enum" AS ENUM('available', 'on_loan', 'sold', 'returned')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."artwork_status_history_newstatus_enum" AS ENUM('available', 'on_loan', 'sold', 'returned')`,
    );
    await queryRunner.query(
      `CREATE TABLE "artwork_status_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "previousStatus" "public"."artwork_status_history_previousstatus_enum", "newStatus" "public"."artwork_status_history_newstatus_enum" NOT NULL, "reason" text, "changedAt" TIMESTAMP NOT NULL DEFAULT now(), "artworkId" uuid, "changedById" uuid, CONSTRAINT "PK_68c60ce6ce8e626831075d5f0b8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."artworks_status_enum" AS ENUM('available', 'on_loan', 'sold', 'returned')`,
    );
    await queryRunner.query(
      `CREATE TABLE "artworks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" text, "technique" character varying, "year" integer, "height" numeric(10,2), "width" numeric(10,2), "depth" numeric(10,2), "price" numeric(10,2) NOT NULL, "reservePrice" numeric(10,2) NOT NULL, "status" "public"."artworks_status_enum" NOT NULL DEFAULT 'available', "imageUrl" character varying, "consignmentDate" TIMESTAMP NOT NULL DEFAULT now(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "artistId" uuid NOT NULL, "galleryId" uuid, CONSTRAINT "PK_e452ea65fb5958274badfe245de" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_71bc10c0dfa9385e3d9f41a7ba" ON "artworks"  ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tokenHash" character varying NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "isRevoked" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "UQ_c25bc63d248ca90e8dcc1d92d06" UNIQUE ("tokenHash"), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c25bc63d248ca90e8dcc1d92d0" ON "refresh_tokens"  ("tokenHash") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'gallery', 'artist', 'collector')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password" character varying NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'collector', "isActive" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "artists" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "bio" text, "nationality" character varying, "birthYear" integer, "specialty" character varying, "websiteUrl" character varying, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "galleryId" uuid NOT NULL, "userId" uuid, CONSTRAINT "REL_f7bd9114dc2849a90d39512911" UNIQUE ("userId"), CONSTRAINT "PK_09b823d4607d2675dc4ffa82261" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_21bf09d63671740127a51b51c5" ON "artists"  ("isActive") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."exhibitions_status_enum" AS ENUM('upcoming', 'ongoing', 'closed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "exhibitions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" text, "location" character varying, "virtualLink" character varying, "startDate" date NOT NULL, "endDate" date NOT NULL, "status" "public"."exhibitions_status_enum" NOT NULL DEFAULT 'upcoming', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "galleryId" uuid NOT NULL, CONSTRAINT "PK_0f4f908f4d38be7ab76b32aead7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "exhibition_artworks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "displayOrder" integer, "notes" text, "addedAt" TIMESTAMP NOT NULL DEFAULT now(), "exhibitionId" uuid, "artworkId" uuid, CONSTRAINT "UQ_a49210a92d7137922a094772119" UNIQUE ("exhibitionId", "artworkId"), CONSTRAINT "PK_c753e03dc42b639ce56cc19132f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."loans_status_enum" AS ENUM('active', 'returned', 'overdue')`,
    );
    await queryRunner.query(
      `CREATE TABLE "loans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "borrower" character varying NOT NULL, "borrowerContact" character varying NOT NULL, "purpose" text, "startDate" date NOT NULL, "expectedReturnDate" date NOT NULL, "actualReturnDate" date, "conditions" text, "status" "public"."loans_status_enum" NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "artworkId" uuid NOT NULL, "galleryId" uuid NOT NULL, CONSTRAINT "PK_5c6942c1e13e4de135c5203ee61" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a630540e1bb9644436a2258c3d" ON "loans"  ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "artist_statements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "period" character varying NOT NULL, "periodStart" date NOT NULL, "periodEnd" date NOT NULL, "totalSalesCount" integer NOT NULL DEFAULT '0', "totalSaleAmount" numeric(10,2) NOT NULL DEFAULT '0', "totalCommission" numeric(10,2) NOT NULL DEFAULT '0', "netAmount" numeric(10,2) NOT NULL DEFAULT '0', "items" jsonb, "generatedAt" date NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "artistId" uuid NOT NULL, "galleryId" uuid NOT NULL, "generatedById" uuid, CONSTRAINT "PK_cb794a1b330bb23aec85298fc6d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."invoices_status_enum" AS ENUM('draft', 'sent', 'paid', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "invoices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "invoiceNumber" character varying NOT NULL, "issuedAt" date NOT NULL, "totalAmount" numeric(10,2) NOT NULL, "vatRate" numeric(5,4) NOT NULL DEFAULT '0.2', "vatAmount" numeric(10,2) NOT NULL, "items" jsonb, "status" "public"."invoices_status_enum" NOT NULL DEFAULT 'draft', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "saleId" uuid, CONSTRAINT "UQ_bf8e0f9dd4558ef209ec111782d" UNIQUE ("invoiceNumber"), CONSTRAINT "REL_23de94fa7468d27abfa62f9e27" UNIQUE ("saleId"), CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bf8e0f9dd4558ef209ec111782" ON "invoices"  ("invoiceNumber") `,
    );
    await queryRunner.query(
      `CREATE TABLE "sales" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "buyer" character varying NOT NULL, "buyerContact" character varying NOT NULL, "saleDate" date NOT NULL, "salePrice" numeric(10,2) NOT NULL, "commissionRate" numeric(5,4) NOT NULL, "galleryCommission" numeric(10,2) NOT NULL, "artistAmount" numeric(10,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "artworkId" uuid, "galleryId" uuid NOT NULL, CONSTRAINT "REL_f09126464ec078856b736ccdc9" UNIQUE ("artworkId"), CONSTRAINT "PK_4f0bc990ae81dba46da680895ea" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "artwork_status_history" ADD CONSTRAINT "FK_6078def674d6daea60c041a995d" FOREIGN KEY ("artworkId") REFERENCES "artworks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "artwork_status_history" ADD CONSTRAINT "FK_447d5c7199e637356ea8976525f" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "artworks" ADD CONSTRAINT "FK_b28e5816ef5870335179a7d8228" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "artworks" ADD CONSTRAINT "FK_a3cae9fd1dfb68df22dd05d5bd1" FOREIGN KEY ("galleryId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_610102b60fea1455310ccd299de" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "artists" ADD CONSTRAINT "FK_d830b928c6ae44ad93b9a92d951" FOREIGN KEY ("galleryId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "artists" ADD CONSTRAINT "FK_f7bd9114dc2849a90d39512911b" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exhibitions" ADD CONSTRAINT "FK_98aca36ae8892141d7199805fab" FOREIGN KEY ("galleryId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exhibition_artworks" ADD CONSTRAINT "FK_0d73e3118bfa9bfd5328bd9f291" FOREIGN KEY ("exhibitionId") REFERENCES "exhibitions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exhibition_artworks" ADD CONSTRAINT "FK_49f461d64493edc8c57d9f7a8e5" FOREIGN KEY ("artworkId") REFERENCES "artworks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" ADD CONSTRAINT "FK_584f4ef5d8e725c3dbe037318ec" FOREIGN KEY ("artworkId") REFERENCES "artworks"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" ADD CONSTRAINT "FK_ef971e358616cd269439cc8ea9c" FOREIGN KEY ("galleryId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "artist_statements" ADD CONSTRAINT "FK_1e4a2296dc5c0613face7edb035" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "artist_statements" ADD CONSTRAINT "FK_886a03080367961e89eca2f04cc" FOREIGN KEY ("galleryId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "artist_statements" ADD CONSTRAINT "FK_d63a8e9027eb2b4d082bd5ecf5a" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD CONSTRAINT "FK_23de94fa7468d27abfa62f9e275" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales" ADD CONSTRAINT "FK_f09126464ec078856b736ccdc94" FOREIGN KEY ("artworkId") REFERENCES "artworks"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales" ADD CONSTRAINT "FK_fe1b47c7c051437f716de5a5a79" FOREIGN KEY ("galleryId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sales" DROP CONSTRAINT "FK_fe1b47c7c051437f716de5a5a79"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales" DROP CONSTRAINT "FK_f09126464ec078856b736ccdc94"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP CONSTRAINT "FK_23de94fa7468d27abfa62f9e275"`,
    );
    await queryRunner.query(
      `ALTER TABLE "artist_statements" DROP CONSTRAINT "FK_d63a8e9027eb2b4d082bd5ecf5a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "artist_statements" DROP CONSTRAINT "FK_886a03080367961e89eca2f04cc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "artist_statements" DROP CONSTRAINT "FK_1e4a2296dc5c0613face7edb035"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" DROP CONSTRAINT "FK_ef971e358616cd269439cc8ea9c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" DROP CONSTRAINT "FK_584f4ef5d8e725c3dbe037318ec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exhibition_artworks" DROP CONSTRAINT "FK_49f461d64493edc8c57d9f7a8e5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exhibition_artworks" DROP CONSTRAINT "FK_0d73e3118bfa9bfd5328bd9f291"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exhibitions" DROP CONSTRAINT "FK_98aca36ae8892141d7199805fab"`,
    );
    await queryRunner.query(
      `ALTER TABLE "artists" DROP CONSTRAINT "FK_f7bd9114dc2849a90d39512911b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "artists" DROP CONSTRAINT "FK_d830b928c6ae44ad93b9a92d951"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_610102b60fea1455310ccd299de"`,
    );
    await queryRunner.query(
      `ALTER TABLE "artworks" DROP CONSTRAINT "FK_a3cae9fd1dfb68df22dd05d5bd1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "artworks" DROP CONSTRAINT "FK_b28e5816ef5870335179a7d8228"`,
    );
    await queryRunner.query(
      `ALTER TABLE "artwork_status_history" DROP CONSTRAINT "FK_447d5c7199e637356ea8976525f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "artwork_status_history" DROP CONSTRAINT "FK_6078def674d6daea60c041a995d"`,
    );
    await queryRunner.query(`DROP TABLE "sales"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bf8e0f9dd4558ef209ec111782"`,
    );
    await queryRunner.query(`DROP TABLE "invoices"`);
    await queryRunner.query(`DROP TYPE "public"."invoices_status_enum"`);
    await queryRunner.query(`DROP TABLE "artist_statements"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a630540e1bb9644436a2258c3d"`,
    );
    await queryRunner.query(`DROP TABLE "loans"`);
    await queryRunner.query(`DROP TYPE "public"."loans_status_enum"`);
    await queryRunner.query(`DROP TABLE "exhibition_artworks"`);
    await queryRunner.query(`DROP TABLE "exhibitions"`);
    await queryRunner.query(`DROP TYPE "public"."exhibitions_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_21bf09d63671740127a51b51c5"`,
    );
    await queryRunner.query(`DROP TABLE "artists"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c25bc63d248ca90e8dcc1d92d0"`,
    );
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_71bc10c0dfa9385e3d9f41a7ba"`,
    );
    await queryRunner.query(`DROP TABLE "artworks"`);
    await queryRunner.query(`DROP TYPE "public"."artworks_status_enum"`);
    await queryRunner.query(`DROP TABLE "artwork_status_history"`);
    await queryRunner.query(
      `DROP TYPE "public"."artwork_status_history_newstatus_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."artwork_status_history_previousstatus_enum"`,
    );
  }
}
