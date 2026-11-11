import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventoryManagerRole1790500100000
  implements MigrationInterface
{
  name = 'AddInventoryManagerRole1790500100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."staff_role_enum" ADD VALUE IF NOT EXISTS 'inventory_manager'`,
    );
  }

  public async down(): Promise<void> {
    // Postgres does not support removing a value from an enum type.
    // Reverting this migration is a no-op; the value stays but unused.
  }
}
