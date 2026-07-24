import assert from "node:assert/strict";
import test from "node:test";

import { extractGeneralUserUpdate } from "../../security/user-update.js";

test("owner profile updates allow a profile image URL without allowing privileged fields", () => {
  const result = extractGeneralUserUpdate({
    name: "Asha",
    profileImageUrl: "https://images.example/profile.jpg",
    role: "ADMIN",
  });

  assert.deepEqual(result.data, {
    name: "Asha",
    profileImageUrl: "https://images.example/profile.jpg",
  });
  assert.deepEqual(result.forbiddenFields, ["role"]);
});
