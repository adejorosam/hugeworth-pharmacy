import { MigrationInterface, QueryRunner } from "typeorm";

export class Phase31790498445763 implements MigrationInterface {
    name = 'Phase31790498445763'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "customer" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "phone" character varying NOT NULL, "medication" character varying NOT NULL, "refillDue" date NOT NULL, "lastReminded" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a7a13f4cacb744524e44dfdad32" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "staff" ADD "pinHash" character varying`);
        await queryRunner.query(`CREATE TYPE "public"."product_branch_enum" AS ENUM('ODA Road', 'Igbatoro')`);
        await queryRunner.query(`ALTER TABLE "product" ADD "branch" "public"."product_branch_enum" NOT NULL DEFAULT 'ODA Road'`);
        await queryRunner.query(`ALTER TABLE "sale" ADD "subtotal" numeric(12,2) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "sale" ADD "discountPct" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "sale" ADD "refunded" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "sale" ADD "refundedAt" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sale" DROP COLUMN "refundedAt"`);
        await queryRunner.query(`ALTER TABLE "sale" DROP COLUMN "refunded"`);
        await queryRunner.query(`ALTER TABLE "sale" DROP COLUMN "discountPct"`);
        await queryRunner.query(`ALTER TABLE "sale" DROP COLUMN "subtotal"`);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "branch"`);
        await queryRunner.query(`DROP TYPE "public"."product_branch_enum"`);
        await queryRunner.query(`ALTER TABLE "staff" DROP COLUMN "pinHash"`);
        await queryRunner.query(`DROP TABLE "customer"`);
    }

}
