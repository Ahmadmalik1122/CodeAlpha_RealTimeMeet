/**
 * One-off migration: mark pre-existing users as verified.
 *
 * Why this is needed
 * ------------------
 * Mongoose's `default: false` only applies to documents created after the
 * field was added to the schema. Every user who registered before the email
 * verification feature shipped has no `isVerified` key at all.
 *
 * The login gate guards against this with a strict `user.isVerified === false`
 * check, so those accounts keep working untouched. But leaving the data in two
 * shapes is a trap for the next person who writes `if (!user.isVerified)`.
 * This script makes the intent explicit in the database.
 *
 * Usage (from the server/ directory):
 *     node scripts/backfillVerified.js          # dry run — reports only
 *     node scripts/backfillVerified.js --apply  # performs the write
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

const APPLY = process.argv.includes("--apply");

// Only documents where the field is entirely absent. Anyone who registered
// after the feature shipped has an explicit true/false that we must not touch.
const FILTER = { isVerified: { $exists: false } };

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  const count = await User.countDocuments(FILTER);

  if (count === 0) {
    console.log("Nothing to backfill — every user already has isVerified set.");
    return;
  }

  console.log(`Found ${count} legacy user(s) with no isVerified field.`);

  if (!APPLY) {
    const sample = await User.find(FILTER).select("email authProvider").limit(10).lean();
    console.log("\nSample of affected accounts:");
    sample.forEach((u) => console.log(`  - ${u.email} (${u.authProvider || "local"})`));
    console.log("\nDry run. Re-run with --apply to set isVerified: true on these.");
    return;
  }

  const result = await User.updateMany(FILTER, { $set: { isVerified: true } });
  console.log(`✅ Backfilled ${result.modifiedCount} user(s) to isVerified: true.`);
}

main()
  .catch((err) => {
    console.error("❌ Backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());
