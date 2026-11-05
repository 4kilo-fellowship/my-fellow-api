import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeUsername } from "../src/utils/username.js";

test("sanitizeUsername strips @, trims, lowercases, and removes illegal characters", () => {
  assert.equal(sanitizeUsername("@Natnael"), "natnael");
  assert.equal(sanitizeUsername("  @natyt_am  "), "natyt_am");
  assert.equal(sanitizeUsername("Nati.Dev!#123"), "nati_dev_123");
  assert.equal(sanitizeUsername("___test___"), "test");
  assert.equal(sanitizeUsername(""), "");
});

test("sanitizeUsername truncates overly long input to leave room for numeric suffix", () => {
  const longName = "verylongfellowshipstudenthandlethatiswaytoolong";
  const sanitized = sanitizeUsername(longName);
  assert.ok(sanitized.length <= 22);
});
