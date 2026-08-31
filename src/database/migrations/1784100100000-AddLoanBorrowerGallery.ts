import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLoanBorrowerGallery1784100100000 implements MigrationInterface {
  name = 'AddLoanBorrowerGallery1784100100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "loans" DROP COLUMN "borrower"`);
    await queryRunner.query(
      `ALTER TABLE "loans" DROP COLUMN "borrowerContact"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" ADD "borrowerGalleryId" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" ADD CONSTRAINT "FK_loans_borrowerGallery" FOREIGN KEY ("borrowerGalleryId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "loans" DROP CONSTRAINT "FK_loans_borrowerGallery"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" DROP COLUMN "borrowerGalleryId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" ADD "borrowerContact" character varying NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" ADD "borrower" character varying NOT NULL DEFAULT ''`,
    );
  }
}
