import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSaleBuyerAccount1783980038709 implements MigrationInterface {
  name = 'AddSaleBuyerAccount1783980038709';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sales" ADD "buyerAccountId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "invoices" ALTER COLUMN "vatRate" SET DEFAULT '0.2'`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales" ADD CONSTRAINT "FK_18ae574d6f3e5e269e690cb6633" FOREIGN KEY ("buyerAccountId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sales" DROP CONSTRAINT "FK_18ae574d6f3e5e269e690cb6633"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ALTER COLUMN "vatRate" SET DEFAULT 0.2`,
    );
    await queryRunner.query(`ALTER TABLE "sales" DROP COLUMN "buyerAccountId"`);
  }
}
