"use strict";

/**
 * Idempotent migration for Postgres:
 * - Adds invites.public_id (if missing)
 * - Ensures indexes exist
 * - Ensures partial unique index exists: one pending invite per (ranch_id, email)
 *
 * Note: We DO NOT add 'email' here because your DB already has it.
 * If you still want to support environments where email is missing,
 * set ADD_EMAIL_IF_MISSING = true.
 */

const ADD_EMAIL_IF_MISSING = false;

async function columnExists(queryInterface, tableName, columnName) {
  const [rows] = await queryInterface.sequelize.query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = :tableName
      AND column_name = :columnName
    LIMIT 1;
  `,
    { replacements: { tableName, columnName } }
  );
  return rows.length > 0;
}

async function indexExists(queryInterface, indexName) {
  const [rows] = await queryInterface.sequelize.query(
    `
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = :indexName
    LIMIT 1;
  `,
    { replacements: { indexName } }
  );
  return rows.length > 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1) Ensure email exists (optional)
    if (ADD_EMAIL_IF_MISSING) {
      const hasEmail = await columnExists(queryInterface, "invites", "email");
      if (!hasEmail) {
        await queryInterface.addColumn("invites", "email", {
          type: Sequelize.STRING(255),
          allowNull: false,
        });
      }
    }

    // 2) Add public_id if missing
    const hasPublicId = await columnExists(
      queryInterface,
      "invites",
      "public_id"
    );

    if (!hasPublicId) {
      await queryInterface.addColumn("invites", "public_id", {
        type: Sequelize.UUID,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      });
    }

    // 3) Create indexes if missing
    if (!(await indexExists(queryInterface, "invites_public_id_unique"))) {
      await queryInterface.addIndex("invites", ["public_id"], {
        unique: true,
        name: "invites_public_id_unique",
      });
    }

    if (!(await indexExists(queryInterface, "invites_token_hash_idx"))) {
      await queryInterface.addIndex("invites", ["token_hash"], {
        name: "invites_token_hash_idx",
      });
    }

    if (!(await indexExists(queryInterface, "invites_ranch_email_idx"))) {
      await queryInterface.addIndex("invites", ["ranch_id", "email"], {
        name: "invites_ranch_email_idx",
      });
    }

    // 4) Partial unique index: one pending invite per ranch+email
    if (
      !(await indexExists(queryInterface, "invites_one_pending_per_ranch_email"))
    ) {
      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX invites_one_pending_per_ranch_email
        ON invites (ranch_id, email)
        WHERE used_at IS NULL;
      `);
    }
  },

  async down(queryInterface) {
    // Drop partial unique index
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS invites_one_pending_per_ranch_email;
    `);

    // Drop indexes
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS invites_ranch_email_idx;
      DROP INDEX IF EXISTS invites_token_hash_idx;
      DROP INDEX IF EXISTS invites_public_id_unique;
    `);

    // Remove public_id if it exists
    const hasPublicId = await columnExists(
      queryInterface,
      "invites",
      "public_id"
    );
    if (hasPublicId) {
      await queryInterface.removeColumn("invites", "public_id");
    }

    // We do NOT remove email in down() (it likely existed already).
  },
};