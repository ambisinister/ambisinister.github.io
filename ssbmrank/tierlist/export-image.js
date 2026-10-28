"use strict";

(() => {
  const button = document.getElementById("export-image");
  const announcement = document.getElementById("announcement");

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("An image could not be loaded. Reload the page and try again."));
      image.src = source;
    });
  }

  function wrapText(context, text, width) {
    const lines = [];
    let line = "";
    for (const character of text) {
      if (context.measureText(line + character).width > width && line) {
        lines.push(line.trim());
        line = character;
      } else line += character;
    }
    if (line) lines.push(line.trim());
    return lines;
  }

  button.addEventListener("click", async () => {
    if (button.disabled) return;
    const snapshot = window.MeleeEditor.snapshot();
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "Exporting…";
    try {
      const width = 1600;
      const labelWidth = 150;
      const cardWidth = 112;
      const cardHeight = 130;
      const gap = 6;
      const columns = 12;
      const rows = snapshot.tiers.map(tier => ({ ...tier, height: Math.max(1, Math.ceil(tier.characters.length / columns)) * (cardHeight + gap) + gap }));
      if (snapshot.unranked.length) rows.push({ label: "Unranked", color: "#7c8580", characters: snapshot.unranked, unranked: true, height: Math.ceil(snapshot.unranked.length / columns) * (cardHeight + gap) + gap });
      const headerHeight = 130;
      const height = headerHeight + rows.reduce((total, row) => total + row.height, 0) + 50;
      if (height > 16000 || width * height > 24000000) throw new Error("This board is too tall for one PNG. Remove unused empty tiers and try again.");
      const images = new Map(await Promise.all(TierListModel.characters.map(async character => [character.id, await loadImage(`assets/characters/${character.id}.png`)])));
      const [ms, melee, sponsor] = await Promise.all(["ms-logo.png", "melee-2026-logo.png", "parry-logo.png"].map(name => loadImage(`assets/${name}`)));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("PNG export is not supported by this browser.");
      context.fillStyle = "#101211";
      context.fillRect(0, 0, width, height);
      context.fillStyle = "#000000";
      context.fillRect(0, 0, width, headerHeight);
      context.drawImage(ms, 18, 13, 90, 88);
      context.drawImage(melee, 132, 10, 192, 98);
      context.drawImage(sponsor, width - 225, 34, 195, 46);
      context.font = "18px sans-serif";
      context.fillStyle = "#b9c7bd";
      context.fillText(snapshot.unranked.length ? `Draft · ${26 - snapshot.unranked.length}/26 ranked` : "26 characters ranked", 355, 66);
      let top = headerHeight;
      let rank = 0;
      for (const row of rows) {
        context.fillStyle = row.color;
        context.fillRect(0, top, labelWidth, row.height);
        const red = parseInt(row.color.slice(1, 3), 16);
        const green = parseInt(row.color.slice(3, 5), 16);
        const blue = parseInt(row.color.slice(5, 7), 16);
        context.fillStyle = red * .299 + green * .587 + blue * .114 > 145 ? "#20201f" : "#ffffff";
        context.font = row.label.length <= 3 ? "bold 38px sans-serif" : "bold 20px sans-serif";
        context.textAlign = "center";
        const lines = wrapText(context, row.label, labelWidth - 18);
        lines.forEach((line, index) => context.fillText(line, labelWidth / 2, top + row.height / 2 + (index - (lines.length - 1) / 2) * 27));
        for (const [index, id] of row.characters.entries()) {
          const left = labelWidth + gap + (index % columns) * (cardWidth + gap);
          const cardTop = top + gap + Math.floor(index / columns) * (cardHeight + gap);
          context.fillStyle = "#26322a";
          context.fillRect(left, cardTop, cardWidth, cardHeight);
          context.drawImage(images.get(id), left + 8, cardTop, 96, 96);
          context.fillStyle = "#edf1ed";
          context.font = "14px sans-serif";
          const name = TierListModel.characters.find(character => character.id === id).name;
          wrapText(context, name, cardWidth - 8).forEach((line, lineIndex) => context.fillText(line, left + cardWidth / 2, cardTop + 108 + lineIndex * 16));
          if (!row.unranked) {
            rank++;
            context.fillStyle = "#101a13";
            context.fillRect(left + 2, cardTop + 2, 28, 22);
            context.fillStyle = "#ffffff";
            context.font = "14px sans-serif";
            context.fillText(String(rank), left + 16, cardTop + 18);
          }
        }
        context.strokeStyle = "#465048";
        context.beginPath();
        context.moveTo(0, top + row.height);
        context.lineTo(width, top + row.height);
        context.stroke();
        top += row.height;
      }
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Could not create a PNG. Try a smaller board.");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = snapshot.unranked.length ? "melee-tier-list-draft.png" : "melee-tier-list.png";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      announcement.textContent = "PNG exported. No ballot or private-link information was sent.";
    } catch (error) {
      announcement.textContent = error.name === "SecurityError" ? "Open this app on the website or a local HTTP server to export PNGs; this browser blocks canvas export from file URLs." : error.message;
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  });
})();
