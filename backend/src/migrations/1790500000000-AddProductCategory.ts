import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductCategory1790500000000 implements MigrationInterface {
  name = 'AddProductCategory1790500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "product_category" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_product_category_name" UNIQUE ("name"), CONSTRAINT "PK_product_category" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `INSERT INTO "product_category" ("name") VALUES ('Analgesics'), ('Antibiotics'), ('Antimalarials'), ('Antidiabetics'), ('Antihypertensives'), ('Vitamins & Supplements'), ('Cold & Flu'), ('Other')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "product_category"`);
  }
}
