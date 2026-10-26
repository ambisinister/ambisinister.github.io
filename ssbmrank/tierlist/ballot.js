"use strict";

const BallotContract = (() => {
  const disclosures = [
    "I would like to make my ballot public",
    "I would like to keep my ballot anonymous",
  ];

  function validate(payload) {
    if (!payload || !disclosures.includes(payload.disclosure)) throw new Error("Choose whether your ballot is public or anonymous.");
    const order = payload.orderedCharacters;
    if (!Array.isArray(order) || order.length !== 26 || new Set(order).size !== 26 || !order.every(name => TierListModel.characters.some(character => character.name === name))) {
      throw new Error("Rank all 26 characters exactly once.");
    }
    const groups = payload.tierGroups;
    if (!groups || !Number.isInteger(groups.tierCount) || groups.tierCount < 1 || groups.tierCount > 26 || !groups.ranges || typeof groups.ranges !== "object" || Array.isArray(groups.ranges)) {
      throw new Error("Invalid tier ranges.");
    }
    const entries = Object.entries(groups.ranges);
    const labels = new Set();
    if (entries.length !== groups.tierCount) throw new Error("Tier count does not match its ranges.");
    for (const [label, range] of entries) {
      if (!label.trim() || label !== label.trim() || label.length > 24 || labels.has(label.toLowerCase())) throw new Error("Tier names must be unique and between 1 and 24 characters.");
      labels.add(label.toLowerCase());
      if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isInteger) || range[0] < 1 || range[1] < range[0] || range[1] > 26) throw new Error("Invalid tier ranges.");
    }
    entries.sort((first, second) => first[1][0] - second[1][0]);
    let nextRank = 1;
    const ranges = Object.create(null);
    for (const [label, range] of entries) {
      if (range[0] !== nextRank) throw new Error("Tier ranges must cover ranks 1–26 without gaps or overlaps.");
      ranges[label] = [...range];
      nextRank = range[1] + 1;
    }
    if (nextRank !== 27) throw new Error("Tier ranges must cover ranks 1–26.");
    return { disclosure: payload.disclosure, orderedCharacters: [...order], tierGroups: { tierCount: entries.length, ranges } };
  }

  return { disclosures, validate };
})();

if (typeof module !== "undefined") module.exports = BallotContract;
