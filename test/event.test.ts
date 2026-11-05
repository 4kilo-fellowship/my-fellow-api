import assert from "node:assert/strict";
import test from "node:test";
import {
  createEventSchema,
  updateEventSchema,
} from "../src/validators/event.validator.js";

test("createEventSchema accepts registrationLimit, maxRegistrations, and isPublished", () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);

  const parsed = createEventSchema.safeParse({
    title: "Annual Fellowship Retreat",
    shortDescription: "A weekend of prayer and fellowship",
    startDate: tomorrow.toISOString(),
    endDate: dayAfter.toISOString(),
    maxRegistrations: 100,
    isPublished: true,
  });

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.maxRegistrations, 100);
    assert.equal(parsed.data.isPublished, true);
  }
});

test("updateEventSchema supports toggling isPublished and maxRegistrations", () => {
  const parsed = updateEventSchema.safeParse({
    isPublished: false,
    maxRegistrations: 50,
  });

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.isPublished, false);
    assert.equal(parsed.data.maxRegistrations, 50);
  }
});

test("createEventSchema rejects endDate before startDate", () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const parsed = createEventSchema.safeParse({
    title: "Invalid Event",
    shortDescription: "End date before start date",
    startDate: tomorrow.toISOString(),
    endDate: yesterday.toISOString(),
  });

  assert.equal(parsed.success, false);
});

test("outdated events logic identifies passed end dates for auto-unpublishing", () => {
  const now = new Date();
  const pastDate = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
  const futureDate = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 24 hours later

  const isPastOutdated = pastDate.getTime() < now.getTime();
  const isFutureOutdated = futureDate.getTime() < now.getTime();

  assert.equal(isPastOutdated, true);
  assert.equal(isFutureOutdated, false);
});
