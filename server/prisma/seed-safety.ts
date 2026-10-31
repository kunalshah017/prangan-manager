type SeedEnvironment = NodeJS.ProcessEnv;

function assertLocalSeedAllowed(environment: SeedEnvironment): void {
  if (environment.NODE_ENV !== "development") {
    throw new Error("Local seed scripts only run in NODE_ENV=development");
  }

  if (environment.ALLOW_LOCAL_SEED !== "true") {
    throw new Error("Local seed scripts require ALLOW_LOCAL_SEED=true");
  }
}

export function assertDestructiveLocalSeedAllowed(
  environment: SeedEnvironment = process.env,
): void {
  assertLocalSeedAllowed(environment);

  if (environment.ALLOW_DESTRUCTIVE_SEED !== "true") {
    throw new Error("Destructive fixtures require ALLOW_DESTRUCTIVE_SEED=true");
  }

  // The flags above can be set by mistake; a remote database is never wiped.
  let host = "";
  try {
    host = new URL(environment.DATABASE_URL ?? "").hostname;
  } catch {
    // Unparsable URL: treated as not local.
  }
  if (!["localhost", "127.0.0.1", "[::1]"].includes(host)) {
    throw new Error("Destructive fixtures only run against a localhost DATABASE_URL");
  }
}

export function assertAdditiveLocalSeedAllowed(
  environment: SeedEnvironment = process.env,
): void {
  assertLocalSeedAllowed(environment);
}

export function getDevelopmentSeedPassword(
  environment: SeedEnvironment = process.env,
): string {
  const password = environment.DEV_SEED_PASSWORD;

  if (!password) {
    throw new Error("Local fixtures require DEV_SEED_PASSWORD");
  }

  return password;
}
