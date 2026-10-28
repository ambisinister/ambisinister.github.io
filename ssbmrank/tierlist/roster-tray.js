"use strict";

(() => {
  const section = document.querySelector(".roster-section");
  const roster = document.getElementById("unranked");
  const home = document.createElement("div");
  home.className = "roster-home";
  section.before(home);
  home.append(section);
  const jump = document.createElement("button");
  jump.type = "button";
  jump.className = "button tray-jump";
  jump.textContent = "Back to tray";
  section.querySelector(".section-heading").append(jump);
  let scheduled = false;
  let dragFrame = null;
  let dragY = null;

  function update() {
    scheduled = false;
    section.classList.remove("floating-tray", "compact-tray");
    home.style.height = "";
    const height = section.getBoundingClientRect().height;
    const top = home.getBoundingClientRect().top;
    const availableHeight = window.innerHeight;
    const atHome = top >= 0 && top <= availableHeight - Math.min(height, availableHeight * .65) - 12;
    const remaining = Number(document.getElementById("remaining-count").textContent);
    const floating = remaining > 0 && !atHome;
    if (floating) {
      home.style.height = `${height}px`;
      section.classList.add("floating-tray");
      if (section.scrollHeight > section.clientHeight) section.classList.add("compact-tray");
    }
    document.body.classList.toggle("has-floating-tray", floating);
    document.documentElement.style.setProperty("--tray-height", floating ? `${section.getBoundingClientRect().height + 12}px` : "0px");
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  }

  jump.addEventListener("click", () => {
    const destination = home.getBoundingClientRect().top + window.scrollY - 12;
    window.scrollTo({ top: destination });
    schedule();
  });
  new MutationObserver(schedule).observe(roster, { childList: true });
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  window.visualViewport?.addEventListener("resize", schedule);

  function stopDragScroll() {
    dragY = null;
    if (dragFrame !== null) cancelAnimationFrame(dragFrame);
    dragFrame = null;
  }

  function scrollDrag() {
    if (dragY === null) return;
    const bottom = section.classList.contains("floating-tray") ? section.getBoundingClientRect().top : window.innerHeight;
    if (dragY < 65) window.scrollBy(0, -12);
    else if (dragY < bottom && dragY > bottom - 65) window.scrollBy(0, 12);
    dragFrame = requestAnimationFrame(scrollDrag);
  }
  document.addEventListener("dragover", event => {
    if (!document.querySelector(".character.dragging")) return;
    dragY = event.clientY;
    if (dragFrame === null) dragFrame = requestAnimationFrame(scrollDrag);
  });
  document.addEventListener("drop", stopDragScroll);
  document.addEventListener("dragend", stopDragScroll);
  window.addEventListener("blur", stopDragScroll);
  schedule();
})();
