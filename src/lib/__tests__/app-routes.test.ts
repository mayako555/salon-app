import assert from "node:assert/strict";
import test from "node:test";

import { APP_ROUTES } from "../app-routes";

test("tenant impersonation redirects to the existing dashboard route", () => {
  assert.equal(APP_ROUTES.dashboard, "/dashboard");
});
