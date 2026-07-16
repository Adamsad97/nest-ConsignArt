import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddArtworkCategories1784100000000 implements MigrationInterface {
  name = 'AddArtworkCategories1784100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8b0be371d28245da6e4f4b6187" UNIQUE ("name"), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "artwork_categories" ("artworkId" uuid NOT NULL, "categoryId" uuid NOT NULL, CONSTRAINT "PK_artwork_categories" PRIMARY KEY ("artworkId", "categoryId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_artwork_categories_artworkId" ON "artwork_categories" ("artworkId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_artwork_categories_categoryId" ON "artwork_categories" ("categoryId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "artwork_categories" ADD CONSTRAINT "FK_artwork_categories_artwork" FOREIGN KEY ("artworkId") REFERENCES "artworks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "artwork_categories" ADD CONSTRAINT "FK_artwork_categories_category" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "artwork_categories" DROP CONSTRAINT "FK_artwork_categories_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "artwork_categories" DROP CONSTRAINT "FK_artwork_categories_artwork"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_artwork_categories_categoryId"`);
    await queryRunner.query(`DROP INDEX "IDX_artwork_categories_artworkId"`);
    await queryRunner.query(`DROP TABLE "artwork_categories"`);
    await queryRunner.query(`DROP TABLE "categories"`);
  }
}
