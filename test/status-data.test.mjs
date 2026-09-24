import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const allowedStates = new Set(["investigating", "monitoring", "operational", "resolved"]);

async function readJson(name) {
  return JSON.parse(await readFile(new URL(`../public/${name}`, import.meta.url), "utf8"));
}

function validDate(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function plainText(value) {
  return typeof value === "string" && value.trim().length > 0 && !/[<>]/.test(value);
}

test("current Jam status follows the publishing contract", async () => {
  const status = await readJson("status.json");
  assert.equal(status.schemaVersion, 1);
  assert.equal(allowedStates.has(status.state), true);
  assert.equal(validDate(status.updatedAt), true);
  assert.equal(plainText(status.notice.title), true);
  assert.equal(plainText(status.notice.summary), true);

  if (status.state === "investigating" || status.state === "monitoring") {
    assert.equal(plainText(status.notice.affected), true);
    assert.equal(plainText(status.notice.safeAction), true);
    assert.equal(validDate(status.notice.nextUpdate), true);
  } else {
    assert.equal(status.notice.affected, null);
    assert.equal(status.notice.safeAction, null);
    assert.equal(status.notice.nextUpdate, null);
  }
});

test("incident history contains resolved, unique public records", async () => {
  const history = await readJson("incidents.json");
  assert.equal(history.schemaVersion, 1);
  assert.equal(Array.isArray(history.incidents), true);

  const ids = new Set();
  for (const incident of history.incidents) {
    assert.equal(plainText(incident.id), true);
    assert.equal(ids.has(incident.id), false);
    ids.add(incident.id);
    assert.equal(plainText(incident.title), true);
    assert.equal(plainText(incident.summary), true);
    assert.equal(validDate(incident.startedAt), true);
    assert.equal(validDate(incident.resolvedAt), true);
    assert.equal(Date.parse(incident.resolvedAt) >= Date.parse(incident.startedAt), true);
  }
});
