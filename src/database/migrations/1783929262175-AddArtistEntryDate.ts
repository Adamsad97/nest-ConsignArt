import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddArtistEntryDate1783929262175 implements MigrationInterface {
  name = 'AddArtistEntryDate1783929262175';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "artists" ADD "entryDate" date NOT NULL DEFAULT ('now'::text)::date`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ALTER COLUMN "vatRate" SET DEFAULT '0.2'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoices" ALTER COLUMN "vatRate" SET DEFAULT 0.2`,
    );
    await queryRunner.query(`ALTER TABLE "artists" DROP COLUMN "entryDate"`);
  }
}
