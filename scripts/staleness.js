/**
 * Shared staleness policy for the build's cached artifacts.
 *
 * Both build-api-docs.js and build-llms.js fall back to a committed cache when
 * their upstream is unreachable. That fallback is correct for a transient blip
 * and wrong for a permanently moved endpoint — the difference is only how long
 * it has been going on, so the two scripts must agree on the limit. They used
 * to disagree: one refused to ship past seven days, the other printed the age
 * and shipped anyway, indefinitely.
 *
 * An unknown age counts as stale. A cache whose timestamp cannot be read
 * cannot be shown to be fresh, and this is the direction to fail in.
 */
const MAX_STALE_DAYS = 7;

const DAY_MS = 86400000;

/** Age in days of an ISO timestamp, or null if it is missing or unparseable. */
function ageInDays(isoString) {
  if (!isoString) return null;
  const then = new Date(isoString);
  if (Number.isNaN(then.getTime())) return null;
  return (Date.now() - then.getTime()) / DAY_MS;
}

/**
 * Throw if a cached artifact is too old to ship, or if its age is unknown.
 * `remedy` should say what to fix, not just what broke.
 */
function assertNotStale({ ageDays, artifact, remedy }) {
  if (ageDays === null) {
    throw new Error(
      `${artifact} carries no readable timestamp, so it cannot be shown to be ` +
        `fresh. Refusing to ship it. ${remedy}`
    );
  }
  if (ageDays > MAX_STALE_DAYS) {
    throw new Error(
      `${artifact} is ${ageDays.toFixed(1)} days old (limit ${MAX_STALE_DAYS}). ` +
        `That is no longer a transient failure. Refusing to ship it. ${remedy}`
    );
  }
}

/** "3.2 days old" / "of unknown age", for warning copy. */
function describeAge(ageDays) {
  return ageDays === null ? "of unknown age" : `${ageDays.toFixed(1)} days old`;
}

module.exports = { MAX_STALE_DAYS, ageInDays, assertNotStale, describeAge };
