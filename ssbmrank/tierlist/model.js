"use strict";

const TierListModel = (() => {
  const characters = [
    ["bowser", "Bowser"], ["captainfalcon", "Captain Falcon"],
    ["donkeykong", "Donkey Kong"], ["drmario", "Dr. Mario"],
    ["falco", "Falco"], ["fox", "Fox"], ["ganondorf", "Ganondorf"],
    ["iceclimbers", "Ice Climbers"], ["jigglypuff", "Jigglypuff"],
    ["kirby", "Kirby"], ["link", "Link"], ["luigi", "Luigi"],
    ["mario", "Mario"], ["marth", "Marth"], ["mewtwo", "Mewtwo"],
    ["mrgameandwatch", "Mr. Game & Watch"], ["ness", "Ness"],
    ["peach", "Peach"], ["pichu", "Pichu"], ["pikachu", "Pikachu"],
    ["roy", "Roy"], ["samus", "Samus"], ["sheik", "Sheik"],
    ["yoshi", "Yoshi"], ["younglink", "Young Link"], ["zelda", "Zelda"],
  ].map(([id, name]) => ({ id, name }));
  const colors = ["#f28b91", "#f5b27e", "#efcf7a", "#b9d98b", "#8dcbb4", "#8ebcdb", "#b2a0d5"];
  const copy = state => JSON.parse(JSON.stringify(state));

  function createState() {
    return {
      version: 1,
      tiers: ["S", "A", "B", "C", "D", "E"].map((label, index) => ({ id: `tier-${index + 1}`, label, color: colors[index], characters: [] })),
      unranked: characters.map(character => character.id),
    };
  }

  function validate(state) {
    if (!state || state.version !== 1 || !Array.isArray(state.tiers) || !state.tiers.length || !Array.isArray(state.unranked)) return false;
    const tierIds = new Set();
    const labels = new Set();
    for (const tier of state.tiers) {
      if (!tier || typeof tier.id !== "string" || !/^tier-\d+$/.test(tier.id) || tierIds.has(tier.id)) return false;
      if (typeof tier.label !== "string" || !tier.label.trim() || tier.label !== tier.label.trim() || tier.label.length > 24 || labels.has(tier.label.toLowerCase())) return false;
      if (typeof tier.color !== "string" || !/^#[0-9a-f]{6}$/i.test(tier.color) || !Array.isArray(tier.characters)) return false;
      tierIds.add(tier.id);
      labels.add(tier.label.toLowerCase());
    }
    const all = [...state.unranked, ...state.tiers.flatMap(tier => tier.characters)];
    return all.length === characters.length && new Set(all).size === characters.length && all.every(id => characters.some(character => character.id === id));
  }

  function zone(state, zoneId) {
    return zoneId === "unranked" ? state.unranked : state.tiers.find(tier => tier.id === zoneId)?.characters;
  }

  function locate(state, characterId) {
    if (state.unranked.includes(characterId)) return "unranked";
    return state.tiers.find(tier => tier.characters.includes(characterId))?.id;
  }

  function move(state, characterId, destination, beforeId = null) {
    const target = zone(state, destination);
    const source = zone(state, locate(state, characterId));
    if (!target || !source || beforeId === characterId) return false;
    if (beforeId !== null && !target.includes(beforeId)) return false;
    source.splice(source.indexOf(characterId), 1);
    const index = beforeId === null ? target.length : target.indexOf(beforeId);
    target.splice(index, 0, characterId);
    return true;
  }

  function addTier(state) {
    const used = new Set(state.tiers.map(tier => tier.label.toLowerCase()));
    let label = ["S", "A", "B", "C", "D", "E", "F", "G"].find(candidate => !used.has(candidate.toLowerCase()));
    let suffix = 1;
    while (!label) {
      const candidate = `Tier ${suffix++}`;
      if (!used.has(candidate.toLowerCase())) label = candidate;
    }
    const id = `tier-${Math.max(...state.tiers.map(tier => Number(tier.id.slice(5)))) + 1}`;
    state.tiers.push({ id, label, color: colors[state.tiers.length % colors.length], characters: [] });
    return id;
  }

  function results(state) {
    if (!validate(state)) throw new Error("This draft is invalid. Reset the board and try again.");
    if (state.unranked.length) throw new Error(`Rank all 26 characters first. ${state.unranked.length} still ${state.unranked.length === 1 ? "needs" : "need"} a spot.`);
    const orderedCharacters = [];
    const ranges = Object.create(null);
    for (const tier of state.tiers) {
      if (!tier.characters.length) continue;
      const start = orderedCharacters.length + 1;
      orderedCharacters.push(...tier.characters.map(id => characters.find(character => character.id === id).name));
      ranges[tier.label] = [start, orderedCharacters.length];
    }
    return { orderedCharacters, tierGroups: { tierCount: Object.keys(ranges).length, ranges } };
  }

  return { characters, colors, copy, createState, validate, zone, locate, move, addTier, results };
})();

if (typeof module !== "undefined") module.exports = TierListModel;
