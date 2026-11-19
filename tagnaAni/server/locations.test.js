import assert from "node:assert/strict";
import test from "node:test";
import { isPhilippineLand, localLocations, savedLocation } from "../src/lib/locations.js";

test("farm setup finds a bundled Philippine ZIP without a network request", () => {
  assert.deepEqual(localLocations(" 9200 ").map(({ name }) => name), ["Iligan City"]);
  assert.equal(localLocations("9999").length, 0);
});

test("manual coordinates accept Philippine land and reject foreign or offshore points", () => {
  assert.ok(isPhilippineLand(8.228, 124.2452));
  assert.ok(isPhilippineLand(14.5995, 120.9842));
  assert.equal(isPhilippineLand(21.03, 105.85), false);
  assert.equal(isPhilippineLand(12, 118), false);
  assert.equal(isPhilippineLand(undefined, 124.2452), false);
});

test("an existing farm keeps its actual coordinates when reopened", () => {
  const profile = { city: "Manila", latitude: 14.5995, longitude: 120.9842 };
  assert.equal(savedLocation(profile).lat, profile.latitude);
  assert.equal(savedLocation(profile).lon, profile.longitude);
  assert.equal(savedLocation({ city: "Iligan City" }).lon, 124.2452);
});
