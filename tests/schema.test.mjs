/* Campus-mode schema sanity — catches malformed SQL before it reaches Supabase. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const sql = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "supabase", "schema.sql"), "utf8");

test("balanced dollar-quoted function bodies", () => {
  assert.equal((sql.match(/\$\$/g) || []).length % 2, 0, "every $$ must be paired");
});

test("balanced parentheses", () => {
  assert.equal((sql.match(/\(/g) || []).length, (sql.match(/\)/g) || []).length);
});

test("all required tables are created", () => {
  ["profiles", "progress", "tests", "materials", "test_results", "global_model"]
    .forEach((t) => assert.match(sql, new RegExp(`create table if not exists public\\.${t}\\b`), `table ${t}`));
});

test("row-level security is enabled on every table", () => {
  assert.ok((sql.match(/enable row level security/g) || []).length >= 6);
});

test("required functions and RPCs exist", () => {
  ["handle_new_user", "my_role", "vote_test", "contribute_adaptive", "set_role", "admin_reset_progress", "admin_delete_user"]
    .forEach((fn) => assert.match(sql, new RegExp(`function public\\.${fn}\\b`), `function ${fn}`));
});

test("privileged functions are security definer", () => {
  // vote_test and the admin RPCs must run with definer rights to enforce rules server-side
  const definers = (sql.match(/security definer/g) || []).length;
  assert.ok(definers >= 5, `expected several security-definer functions, found ${definers}`);
});

test("RLS policies are defined", () => {
  assert.ok((sql.match(/create policy/g) || []).length >= 12);
});
