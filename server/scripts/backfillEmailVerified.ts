import mongoConnection from "../src/shared/infra/db/mongo/mongoConnection";
import { UserModel } from "../src/shared/infra/db/mongo/models/user.model";
import logger from "../src/shared/config/logger.config";

// One-off backfill: `isEmailVerified` was added after accounts already existed,
// defaulting to false. Since login is now blocked for unverified accounts, this
// would retroactively lock out every pre-existing user (including admins who have
// no way to receive a verification email for an account created before this
// feature existed). Grandfather them in as verified. Safe to re-run — only ever
// touches documents where the field is still unset.
async function run() {
   await mongoConnection.connect();

   const result = await UserModel.updateMany({ isEmailVerified: { $exists: false } }, { $set: { isEmailVerified: true } });

   logger.info(`[BackfillEmailVerified] Grandfathered ${result.modifiedCount} pre-existing user(s) as verified.`);
   await mongoConnection.disconnect();
   process.exit(0);
}

run().catch((error) => {
   logger.error("[BackfillEmailVerified] Failed", { error: error instanceof Error ? error.message : error });
   process.exit(1);
});
