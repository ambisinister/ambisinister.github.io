"use strict";

(() => {
  const model = TierListModel;
  let storageKey = "melee-tier-list:draft:v1";
  const elements = Object.fromEntries([...document.querySelectorAll("[id]")].map(element => [element.id, element]));
  let state = model.createState();
  let selected = null;
  let dragged = null;
  let editingTier = null;
  let generatedResults = null;
  let draftNotice = "Local draft";
  const history = [];

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const restored = JSON.parse(saved);
      if (!model.validate(restored)) throw new Error("Invalid draft");
      state = restored;
      draftNotice = "Draft restored";
    }
  } catch {
    draftNotice = "Couldn’t restore a draft. This board still works locally.";
  }

  function announce(message) {
    elements.announcement.textContent = message;
  }

  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      draftNotice = "Saved locally";
    } catch {
      draftNotice = "Browser storage unavailable. Keep this tab open to retain your draft.";
    }
  }

  function focusCharacter(characterId) {
    document.querySelector(`[data-character="${characterId}"]`)?.focus({ preventScroll: true });
  }

  function change(action, message) {
    const previous = model.copy(state);
    action();
    if (!model.validate(state)) {
      state = previous;
      announce("That change could not be applied.");
      return false;
    }
    if (JSON.stringify(previous) === JSON.stringify(state)) return false;
    history.push(previous);
    if (history.length > 60) history.shift();
    generatedResults = null;
    elements.results.hidden = true;
    elements["form-error"].hidden = true;
    save();
    render();
    if (message) announce(message);
    return true;
  }

  function makeButton(text, className, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    if (label) {
      button.setAttribute("aria-label", label);
      button.title = label;
    }
    return button;
  }

  function characterCard(characterId, rank = null) {
    const character = model.characters.find(candidate => candidate.id === characterId);
    const card = makeButton("", "character", `${character.name}${rank ? `, rank ${rank}` : ", unranked"}. Select to move.`);
    card.dataset.character = characterId;
    card.draggable = true;
    card.classList.toggle("selected", selected === characterId);
    card.setAttribute("aria-pressed", String(selected === characterId));
    const portrait = document.createElement("img");
    portrait.src = window.MELEE_PORTRAITS?.[characterId] || `assets/characters/${characterId}.png`;
    portrait.alt = "";
    portrait.draggable = false;
    portrait.width = 100;
    portrait.height = 100;
    const label = document.createElement("span");
    label.className = "character-name";
    label.textContent = character.name;
    card.append(portrait, label);
    if (rank !== null) {
      const badge = document.createElement("span");
      badge.className = "rank";
      badge.textContent = String(rank).padStart(2, "0");
      card.append(badge);
    }
    return card;
  }

  function render() {
    const activeCharacter = document.activeElement?.dataset.character;
    let rank = 0;
    const rows = state.tiers.map((tier, index) => {
      const row = document.createElement("div");
      row.className = "tier-row";
      row.dataset.tier = tier.id;
      const label = makeButton("", "tier-label", `Edit tier ${tier.label}`);
      label.title = `Edit tier ${tier.label}. Drop a character here to rank it first in this tier.`;
      label.dataset.action = "edit";
      label.style.background = tier.color;
      const red = parseInt(tier.color.slice(1, 3), 16);
      const green = parseInt(tier.color.slice(3, 5), 16);
      const blue = parseInt(tier.color.slice(5, 7), 16);
      label.style.color = red * .299 + green * .587 + blue * .114 > 145 ? "#20201f" : "#ffffff";
      label.classList.toggle("long-label", tier.label.length > 3);
      const name = document.createElement("strong");
      name.textContent = tier.label;
      const range = document.createElement("small");
      range.textContent = tier.characters.length ? `${rank + 1}${tier.characters.length > 1 ? `–${rank + tier.characters.length}` : ""}` : "EMPTY";
      label.append(name, range);
      const zone = document.createElement("div");
      zone.className = "tier-zone";
      zone.dataset.zone = tier.id;
      zone.setAttribute("role", "group");
      zone.setAttribute("aria-label", `Tier ${tier.label}, ordered strongest to weakest`);
      for (const characterId of tier.characters) zone.append(characterCard(characterId, ++rank));
      if (selected) {
        const place = makeButton("Place here +", "place-here", `Place selected character at the end of tier ${tier.label}`);
        place.dataset.place = tier.id;
        zone.append(place);
      } else if (!tier.characters.length) {
        const hint = document.createElement("span");
        hint.className = "empty-tier";
        hint.textContent = "Drop characters here";
        zone.append(hint);
      }
      const controls = document.createElement("div");
      controls.className = "tier-controls";
      for (const [action, symbol, description] of [["edit", "⚙", "Edit tier"], ["up", "↑", "Move tier up"], ["down", "↓", "Move tier down"]]) {
        const button = makeButton(symbol, "", `${description}: ${tier.label}`);
        button.dataset.action = action;
        button.disabled = (action === "up" && index === 0) || (action === "down" && index === state.tiers.length - 1);
        controls.append(button);
      }
      row.append(label, zone, controls);
      return row;
    });
    elements["tier-board"].replaceChildren(...rows);
    renderRoster();
    elements["remaining-count"].textContent = state.unranked.length;
    elements["completion-label"].replaceChildren();
    const completed = document.createElement("strong");
    completed.textContent = `${26 - state.unranked.length} / 26`;
    elements["completion-label"].append(completed, " ranked");
    elements["completion-progress"].value = 26 - state.unranked.length;
    elements["save-status"].textContent = draftNotice;
    elements.undo.disabled = !history.length;
    renderSelection();
    if (activeCharacter) focusCharacter(activeCharacter);
  }

  function renderRoster() {
    const query = elements["character-search"].value.trim().toLowerCase();
    const matches = state.unranked.filter(id => model.characters.find(character => character.id === id).name.toLowerCase().includes(query));
    elements.unranked.replaceChildren(...matches.map(id => characterCard(id)));
    if (!matches.length) {
      const empty = document.createElement("p");
      empty.className = "roster-empty";
      empty.textContent = state.unranked.length ? "No matches" : "All characters ranked";
      elements.unranked.append(empty);
    }
  }

  function renderSelection() {
    elements["selection-bar"].hidden = !selected;
    if (!selected) return;
    elements["selection-name"].textContent = model.characters.find(character => character.id === selected).name;
    const current = model.locate(state, selected);
    const oldDestination = elements["move-destination"].value;
    const options = [...state.tiers.map(tier => ({ value: tier.id, label: `Tier ${tier.label}` })), { value: "unranked", label: "Unranked" }];
    elements["move-destination"].replaceChildren(...options.map(({ value, label }) => new Option(label, value)));
    elements["move-destination"].value = options.some(option => option.value === oldDestination) ? oldDestination : current;
    const members = model.zone(state, current);
    elements["move-left"].disabled = members.indexOf(selected) === 0;
    elements["move-right"].disabled = members.indexOf(selected) === members.length - 1;
    elements["unrank-selected"].disabled = current === "unranked";
  }

  function moveCharacter(characterId, destination, beforeId = null, keepSelection = false) {
    const name = model.characters.find(character => character.id === characterId)?.name;
    const target = destination === "unranked" ? "the remaining cast" : `tier ${state.tiers.find(tier => tier.id === destination)?.label}`;
    if (!keepSelection) selected = null;
    if (!change(() => model.move(state, characterId, destination, beforeId), `${name} moved to ${target}.`)) render();
    focusCharacter(characterId);
  }

  function openTierSettings(tierId) {
    const tier = state.tiers.find(candidate => candidate.id === tierId);
    editingTier = tierId;
    elements["tier-label"].value = tier.label;
    elements["tier-color"].value = tier.color;
    elements["tier-error"].hidden = true;
    elements["delete-tier"].disabled = state.tiers.length === 1;
    elements["tier-dialog"].showModal();
    elements["tier-label"].focus();
    elements["tier-label"].select();
  }

  function closeTierSettings() {
    elements["tier-dialog"].close();
    document.querySelector(`[data-tier="${editingTier}"] [data-action="edit"]`)?.focus();
  }

  document.addEventListener("click", event => {
    const card = event.target.closest("[data-character]");
    if (card) {
      const characterId = card.dataset.character;
      if (selected && selected !== characterId) {
        moveCharacter(selected, model.locate(state, characterId), characterId);
      } else {
        selected = selected === characterId ? null : characterId;
        render();
        focusCharacter(characterId);
        announce(selected ? `${model.characters.find(character => character.id === selected).name} selected. Choose Place here, another character to insert before, or use the move controls.` : "Selection cleared.");
      }
      return;
    }
    const place = event.target.closest("[data-place]");
    if (place && selected) {
      moveCharacter(selected, place.dataset.place);
      return;
    }
    const actionButton = event.target.closest("[data-action]");
    if (actionButton) {
      const tierId = actionButton.closest("[data-tier]").dataset.tier;
      const action = actionButton.dataset.action;
      if (action === "edit") return openTierSettings(tierId);
      const index = state.tiers.findIndex(tier => tier.id === tierId);
      const destination = index + (action === "up" ? -1 : 1);
      if (destination < 0 || destination >= state.tiers.length) return;
      change(() => {
        const [tier] = state.tiers.splice(index, 1);
        state.tiers.splice(destination, 0, tier);
      }, `Tier moved ${action}. Character ranks updated.`);
      const nextControl = document.querySelector(`[data-tier="${tierId}"] [data-action="${action}"]`);
      (nextControl?.disabled ? document.querySelector(`[data-tier="${tierId}"] [data-action="edit"]`) : nextControl)?.focus();
      return;
    }
    const zone = event.target.closest("[data-zone]");
    if (zone && selected) moveCharacter(selected, zone.dataset.zone);
  });

  elements["character-search"].addEventListener("input", renderRoster);
  elements["add-tier"].addEventListener("click", () => {
    let newId;
    change(() => { newId = model.addTier(state); }, "New tier added. You can rename or recolor it.");
    document.querySelector(`[data-tier="${newId}"]`)?.scrollIntoView({ block: "nearest" });
    openTierSettings(newId);
  });
  elements["close-dialog"].addEventListener("click", closeTierSettings);
  elements["tier-settings"].addEventListener("submit", event => {
    event.preventDefault();
    const label = elements["tier-label"].value.trim();
    const duplicate = state.tiers.some(tier => tier.id !== editingTier && tier.label.toLowerCase() === label.toLowerCase());
    if (!label || duplicate) {
      elements["tier-error"].textContent = duplicate ? "Give each tier a unique name so its range can be exported." : "Please enter a tier name.";
      elements["tier-error"].hidden = false;
      elements["tier-label"].focus();
      return;
    }
    change(() => {
      const tier = state.tiers.find(candidate => candidate.id === editingTier);
      tier.label = label;
      tier.color = elements["tier-color"].value;
    }, `Tier ${label} saved.`);
    closeTierSettings();
  });
  elements["delete-tier"].addEventListener("click", () => {
    if (state.tiers.length <= 1) return;
    change(() => {
      const index = state.tiers.findIndex(tier => tier.id === editingTier);
      state.unranked.push(...state.tiers[index].characters);
      state.tiers.splice(index, 1);
    }, "Tier removed. Its characters are back in the remaining cast. Undo is available.");
    closeTierSettings();
    elements["add-tier"].focus();
  });
  elements["move-selected"].addEventListener("click", () => { if (selected) moveCharacter(selected, elements["move-destination"].value); });
  elements["unrank-selected"].addEventListener("click", () => { if (selected) moveCharacter(selected, "unranked"); });
  for (const [buttonId, direction] of [["move-left", -1], ["move-right", 1]]) {
    elements[buttonId].addEventListener("click", () => {
      if (!selected) return;
      const destination = model.locate(state, selected);
      const members = model.zone(state, destination);
      const index = members.indexOf(selected);
      if (index + direction < 0 || index + direction >= members.length) return;
      moveCharacter(selected, destination, direction === -1 ? members[index - 1] : (members[index + 2] ?? null), true);
    });
  }
  elements["cancel-selection"].addEventListener("click", () => {
    const previous = selected;
    selected = null;
    render();
    if (previous) focusCharacter(previous);
    announce("Selection cleared.");
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !elements["tier-dialog"].open && selected) elements["cancel-selection"].click();
  });
  elements.undo.addEventListener("click", () => {
    if (!history.length) return;
    state = history.pop();
    generatedResults = null;
    elements.results.hidden = true;
    elements["form-error"].hidden = true;
    save();
    render();
    announce("Last change undone.");
  });
  elements.reset.addEventListener("click", () => {
    if (!window.confirm("Reset your list? All characters will return to the remaining cast and the default tiers will be restored. You can undo this.")) return;
    selected = null;
    elements["character-search"].value = "";
    change(() => { state = model.createState(); }, "Board reset. Undo is available.");
    render();
  });
  elements["tier-controls-toggle"].addEventListener("click", () => {
    const enabled = document.body.classList.toggle("show-tier-controls");
    elements["tier-controls-toggle"].setAttribute("aria-pressed", String(enabled));
    elements["tier-controls-toggle"].textContent = enabled ? "Hide tier controls" : "Tier controls";
    announce(enabled ? "Tier controls shown." : "Tier controls hidden.");
  });

  function clearDropIndicators() {
    document.querySelectorAll(".drop-active, .drop-before").forEach(element => element.classList.remove("drop-active", "drop-before"));
  }

  function dropPosition(event) {
    const label = event.target.closest(".tier-label");
    if (label) {
      const zone = label.closest("[data-tier]").querySelector("[data-zone]");
      return { zone, label, beforeId: model.zone(state, zone.dataset.zone)[0] ?? null };
    }
    const zone = event.target.closest("[data-zone]");
    if (!zone) return null;
    const card = event.target.closest("[data-character]");
    let beforeId = null;
    if (card) {
      const rectangle = card.getBoundingClientRect();
      beforeId = card.dataset.character;
      if (event.clientX > rectangle.left + rectangle.width / 2) {
        const members = model.zone(state, zone.dataset.zone);
        beforeId = members[members.indexOf(beforeId) + 1] ?? null;
      }
    }
    return { zone, beforeId };
  }

  document.addEventListener("dragstart", event => {
    const card = event.target.closest("[data-character]");
    if (!card) return;
    dragged = card.dataset.character;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", dragged);
    card.classList.add("dragging");
  });
  document.addEventListener("dragover", event => {
    if (!dragged) return;
    const destination = dropPosition(event);
    clearDropIndicators();
    if (!destination) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    destination.zone.classList.add("drop-active");
    destination.label?.classList.add("drop-active");
    if (destination.beforeId) destination.zone.querySelector(`[data-character="${destination.beforeId}"]`)?.classList.add("drop-before");
  });
  document.addEventListener("drop", event => {
    if (!dragged) return;
    const destination = dropPosition(event);
    event.preventDefault();
    const characterId = dragged;
    dragged = null;
    clearDropIndicators();
    document.querySelectorAll(".dragging").forEach(card => card.classList.remove("dragging"));
    if (destination) moveCharacter(characterId, destination.zone.dataset.zone, destination.beforeId);
  });
  document.addEventListener("dragend", () => {
    dragged = null;
    clearDropIndicators();
    document.querySelectorAll(".dragging").forEach(card => card.classList.remove("dragging"));
  });

  elements["generate-results"].addEventListener("click", () => {
    try {
      generatedResults = model.results(state);
      elements["ranking-output"].textContent = JSON.stringify(generatedResults.orderedCharacters, null, 2);
      elements["tiers-output"].textContent = JSON.stringify(generatedResults.tierGroups, null, 2);
      elements["form-error"].hidden = true;
      elements.results.hidden = false;
      elements["results-title"].focus({ preventScroll: true });
      elements.results.scrollIntoView({ block: "start" });
      announce("Results generated locally. Nothing has been submitted to a server.");
    } catch (error) {
      elements["form-error"].textContent = error.message;
      elements["form-error"].hidden = false;
      elements["form-error"].scrollIntoView({ block: "nearest" });
    }
  });
  document.querySelectorAll("[data-copy]").forEach(button => button.addEventListener("click", async () => {
    const output = elements[button.dataset.copy];
    try {
      await navigator.clipboard.writeText(output.textContent);
      announce("JSON copied to clipboard.");
    } catch {
      const range = document.createRange();
      range.selectNodeContents(output);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      output.focus();
      announce("Clipboard unavailable. JSON selected—use your browser’s Copy command.");
    }
  }));
  elements["download-results"].addEventListener("click", () => {
    if (!generatedResults) return;
    for (const [name, data] of [["melee-ordered-characters.json", generatedResults.orderedCharacters], ["melee-tier-ranges.json", generatedResults.tierGroups]]) {
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2) + "\n"], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
    announce("Two JSON files generated. If your browser blocks multiple downloads, use Copy JSON for each output.");
  });

  window.MeleeEditor = {
    results: () => model.results(state),
    snapshot: () => model.copy(state),
    setDraftScope(scope) {
      storageKey = `melee-tier-list:draft:v1:${scope}`;
      state = model.createState();
      selected = null;
      generatedResults = null;
      history.length = 0;
      elements.results.hidden = true;
      elements["character-search"].value = "";
      draftNotice = "Local draft";
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const restored = JSON.parse(saved);
          if (!model.validate(restored)) throw new Error("Invalid draft");
          state = restored;
          draftNotice = "Draft restored";
        }
      } catch {
        draftNotice = "Couldn’t restore this link’s draft. Keep this tab open while editing.";
      }
      render();
    },
  };
  document.querySelector(".project-logos").addEventListener("click", event => {
    event.preventDefault();
    window.scrollTo({ top: 0 });
  });
  render();
})();
