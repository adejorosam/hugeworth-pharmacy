import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1790492264930 implements MigrationInterface {
    name = 'InitSchema1790492264930'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."staff_role_enum" AS ENUM('admin', 'pharmacist', 'cashier')`);
        await queryRunner.query(`CREATE TABLE "staff" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "role" "public"."staff_role_enum" NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_902985a964245652d5e3a0f5f6a" UNIQUE ("email"), CONSTRAINT "PK_e4ee98bb552756c180aec1e854a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "product" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "category" character varying NOT NULL, "supplier" character varying NOT NULL, "qty" integer NOT NULL DEFAULT '0', "minQty" integer NOT NULL DEFAULT '0', "price" numeric(12,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bebc9158e480b949565b4dc7a82" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "sale_item" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "saleId" uuid NOT NULL, "productId" uuid, "productName" character varying NOT NULL, "qty" integer NOT NULL, "price" numeric(12,2) NOT NULL, CONSTRAINT "PK_439a57a4a0d130329d3d2e671b6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "sale" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "invoiceNo" character varying NOT NULL, "cashierId" uuid NOT NULL, "total" numeric(12,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_752c3f9f54cf5548b9d34c195ff" UNIQUE ("invoiceNo"), CONSTRAINT "PK_d03891c457cbcd22974732b5de2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "activity_log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "staffId" uuid, "action" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_067d761e2956b77b14e534fd6f1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "sale_item" ADD CONSTRAINT "FK_59208ed392dd61056abbcf1482e" FOREIGN KEY ("saleId") REFERENCES "sale"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sale_item" ADD CONSTRAINT "FK_d4361a12f11a57a6cf2a2ee6ac9" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sale" ADD CONSTRAINT "FK_c5c67084934bf39ddf5ed2455cb" FOREIGN KEY ("cashierId") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "activity_log" ADD CONSTRAINT "FK_800727bffcf3314efc05212a5e4" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "activity_log" DROP CONSTRAINT "FK_800727bffcf3314efc05212a5e4"`);
        await queryRunner.query(`ALTER TABLE "sale" DROP CONSTRAINT "FK_c5c67084934bf39ddf5ed2455cb"`);
        await queryRunner.query(`ALTER TABLE "sale_item" DROP CONSTRAINT "FK_d4361a12f11a57a6cf2a2ee6ac9"`);
        await queryRunner.query(`ALTER TABLE "sale_item" DROP CONSTRAINT "FK_59208ed392dd61056abbcf1482e"`);
        await queryRunner.query(`DROP TABLE "activity_log"`);
        await queryRunner.query(`DROP TABLE "sale"`);
        await queryRunner.query(`DROP TABLE "sale_item"`);
        await queryRunner.query(`DROP TABLE "product"`);
        await queryRunner.query(`DROP TABLE "staff"`);
        await queryRunner.query(`DROP TYPE "public"."staff_role_enum"`);
    }

}
