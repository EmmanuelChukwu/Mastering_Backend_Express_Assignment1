import dotenv from "dotenv";


// ============================================================
// TEST ENVIRONMENT
// ============================================================
//
// Vitest will load this file before running the tests.
//
// That means modules such as Prisma can read the test
// DATABASE_URL instead of accidentally connecting to the
// development database.
// ============================================================

dotenv.config({
  path: ".env.test",
});