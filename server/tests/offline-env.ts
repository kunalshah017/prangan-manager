// Loaded before every test file. Prisma reads server/.env, which points at the
// production database and push keys, for any query a test forgets to stub.
// Values set here win over .env, so a missed stub fails fast instead of
// writing real notifications or pushing to real phones.
process.env.DATABASE_URL = "postgresql://tests:tests@127.0.0.1:9/offline";
process.env.VAPID_PUBLIC_KEY = "";
process.env.VAPID_PRIVATE_KEY = "";
process.env.CLOUDINARY_API_SECRET = "";
