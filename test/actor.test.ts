import test from "node:test";
import assert from "node:assert/strict";
import { CANONICAL_TEAMS, OFFICIAL_ACTOR } from "../src/modules/actors/actor.service.js";

test("canonical fellowship teams strictly match the 8 teams from personalization", () => {
  const teamNames = CANONICAL_TEAMS.map((t) => t.displayName);
  const expectedTeams = [
    "Bible Study",
    "Evangelism",
    "Worship",
    "I4U",
    "Media & Literature",
    "Prayer",
    "Freshman",
    "Other Ministry",
  ];

  assert.equal(CANONICAL_TEAMS.length, 8);
  assert.deepEqual(teamNames, expectedTeams);

  // Verify no fictitious teams exist
  assert.equal(teamNames.includes("Counseling"), false);
  assert.equal(teamNames.includes("Admin"), false);
});

test("official actor matches fellowship identity with verified checkmark", () => {
  assert.equal(OFFICIAL_ACTOR.type, "official");
  assert.equal(OFFICIAL_ACTOR.handle, "4kilo_ecsf");
  assert.equal(OFFICIAL_ACTOR.displayName, "4 Kilo Christian Students Fellowship");
  assert.equal(OFFICIAL_ACTOR.isVerified, true);
});
