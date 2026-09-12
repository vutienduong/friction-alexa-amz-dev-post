import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateImpact,
  extractFriction,
  findMatchingCluster,
  summarizeProgress,
} from "./friction.ts";

test("extracts a manual reporting friction from natural language", () => {
  const result = extractFriction(
    "Alexa, log a friction. I had to copy numbers from one spreadsheet to another again.",
  );

  assert.equal(result.title, "Manual reporting workflow");
  assert.equal(result.category, "manual_work");
  assert.equal(result.context, "work");
  assert.equal(result.estimatedMinutes, 12);
});

test("matches semantically related reporting descriptions", () => {
  const cluster = findMatchingCluster("Moved numbers between sheets again", [
    { id: "meetings", name: "Meetings without an agenda", keywords: ["meeting", "agenda"] },
    { id: "reporting", name: "Manual reporting workflow", keywords: ["spreadsheet", "report", "numbers", "sheets"] },
  ]);

  assert.equal(cluster?.id, "reporting");
});

test("calculates weighted impact from occurrences and minutes", () => {
  assert.equal(calculateImpact(5, 58, 1.2), 69.6);
});

test("summarizes progress and annualized savings", () => {
  const progress = summarizeProgress([
    { status: "active", occurrences: 5, totalMinutes: 58 },
    { status: "resolved", occurrences: 3, totalMinutes: 42 },
  ]);

  assert.deepEqual(progress, {
    patternsFound: 2,
    frictionsLogged: 8,
    minutesWasted: 100,
    minutesSavedWeekly: 42,
    hoursSavedYearly: 36.4,
  });
});
