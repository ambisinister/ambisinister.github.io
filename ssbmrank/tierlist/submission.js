"use strict";

(() => {
  const form = document.getElementById("tier-form");
  const submit = document.getElementById("submit-ballot");
  const status = document.getElementById("submission-status");
  const errorPanel = document.getElementById("form-error");
  const confirmation = document.getElementById("submission-dialog");
  let token = null;
  let linkId = null;
  let pending = null;
  let sending = false;
  const apiBaseUrl = (window.MELEE_CONFIG?.apiBaseUrl || "").replace(/\/$/, "");

  async function rpc(method, payload, credential) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 40000);
    let response;
    let data;
    try {
      response = await fetch(`${apiBaseUrl}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${credential}` },
        body: JSON.stringify(payload),
        credentials: "omit",
        cache: "no-store",
        referrerPolicy: "no-referrer",
        redirect: "error",
        signal: controller.signal,
      });
      data = await response.json();
    } catch {
      throw new Error("No confirmation received. Check your connection and retry the unchanged ballot; the same attempt will not create a duplicate.");
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok || data?.ok !== true) throw new Error(typeof data?.error === "string" ? data.error : "The ballot service did not accept this request. Please retry.");
    return data.result;
  }

  function showError(message) {
    errorPanel.textContent = message;
    errorPanel.hidden = false;
    errorPanel.scrollIntoView({ block: "nearest" });
  }

  function showConfirmation(receipt) {
    const number = receipt.submissionNumber;
    const hasNumber = Number.isSafeInteger(number) && number > 0;
    const lastTwo = number % 100;
    const suffix = lastTwo >= 11 && lastTwo <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[number % 10] || "th");
    const message = hasNumber ? `This is your ${number}${suffix} submission.` : "Your ballot has been saved.";
    document.getElementById("submission-dialog-details").textContent = message + (receipt.duplicate ? " This submission was already saved; no duplicate was created." : "");
    confirmation.showModal();
  }

  confirmation.addEventListener("close", () => submit.focus({ preventScroll: true }));

  async function connect(location) {
    const params = new URLSearchParams((location.hash || "").replace(/^#/, ""));
    const candidate = params.get("invite");
    if (!candidate || !/^[A-Za-z0-9_-]{43}$/.test(candidate)) {
      form.inert = false;
      status.textContent = "Open the private ballot link supplied by the organizer to submit.";
      return;
    }
    status.textContent = "Checking private link…";
    try {
      const context = await rpc("context", {}, candidate);
      if (!context || typeof context.linkId !== "string" || !/^[0-9a-f-]{36}$/i.test(context.linkId)) throw new Error("The link could not be verified. Reload or contact the organizer.");
      token = candidate;
      linkId = context.linkId;
      window.MeleeEditor.setDraftScope(linkId);
      try {
        pending = JSON.parse(sessionStorage.getItem(`melee-attempt:${linkId}`) || "null");
      } catch {
        pending = null;
      }
      submit.disabled = false;
      status.textContent = "Private link ready. Revisions are saved as new timestamped submissions.";
    } catch (error) {
      status.textContent = error.message;
    } finally {
      form.inert = false;
    }
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (sending) return;
    if (!token || !linkId) return showError("Open a valid private ballot link to submit. Preview JSON still works locally.");
    if (!form.reportValidity()) return;
    let ballot;
    try {
      ballot = BallotContract.validate({ ...window.MeleeEditor.results(), disclosure: new FormData(form).get("disclosure") });
    } catch (error) {
      showError(error.message);
      return;
    }
    const fingerprint = JSON.stringify(ballot);
    if (!pending || pending.fingerprint !== fingerprint || typeof pending.requestId !== "string" || !/^[0-9a-f-]{36}$/i.test(pending.requestId)) {
      pending = { fingerprint, requestId: crypto.randomUUID() };
    }
    try {
      sessionStorage.setItem(`melee-attempt:${linkId}`, JSON.stringify(pending));
    } catch {
      status.textContent = "Keep this tab open if you need to retry; browser storage is unavailable.";
    }
    const requestId = pending.requestId;
    sending = true;
    form.inert = true;
    form.setAttribute("aria-busy", "true");
    submit.disabled = true;
    submit.textContent = "Submitting…";
    errorPanel.hidden = true;
    status.textContent = "Saving ballot…";
    let confirmedReceipt = null;
    try {
      const receipt = await rpc("submit", { ...ballot, requestId }, token);
      if (!receipt || receipt.submissionId !== requestId || !Number.isFinite(Date.parse(receipt.timestamp))) throw new Error("No valid confirmation received. Retry without changing your ballot to check its status.");
      status.textContent = `${receipt.duplicate ? "Already saved" : "Ballot saved"} at ${receipt.timestamp}. Receipt: ${receipt.submissionId}. Changes can be submitted as a new revision.`;
      confirmedReceipt = receipt;
    } catch (error) {
      showError(error.message);
      status.textContent = "Submission not confirmed. Your ballot is still here; retry the same ballot safely.";
    } finally {
      sending = false;
      form.inert = false;
      form.removeAttribute("aria-busy");
      submit.disabled = false;
      submit.textContent = "Submit ballot";
    }
    if (confirmedReceipt) showConfirmation(confirmedReceipt);
  });

  if (!apiBaseUrl) return;
  try {
    const api = new URL(apiBaseUrl);
    if (api.protocol !== "https:" || api.username || api.password || api.search || api.hash) throw new Error("Invalid API URL");
  } catch {
    status.textContent = "The submission endpoint is not configured correctly. Preview JSON is still available.";
    return;
  }
  form.inert = true;
  connect(window.location);
})();
