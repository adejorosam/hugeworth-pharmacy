import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExpiryReorderToProduct1790497873954 implements MigrationInterface {
    name = 'AddExpiryReorderToProduct1790497873954'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product" ADD "reorderLevel" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "product" ADD "expiryDate" date NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "expiryDate"`);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "reorderLevel"`);
    }

}
