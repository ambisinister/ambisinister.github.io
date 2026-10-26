"use strict";

(() => {
  const form = document.getElementById("tier-form");
  const submit = document.getElementById("submit-ballot");
  const status = document.getElementById("submission-status");
  const errorPanel = document.getElementById("form-error");
  let token = null;
  let linkId = null;
  let pending = null;
  let sending = false;

  function rpc(method, payload) {
    return new Promise((resolve, reject) => {
      let finished = false;
      const timeout = setTimeout(() => {
        finished = true;
        reject(new Error("No confirmation received. Your submission may have arrived. Retry without changing the ballot to check it without creating a duplicate."));
      }, 45000);
      const finish = callback => value => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        callback(value);
      };
      const runner = google.script.run
        .withSuccessHandler(finish(resolve))
        .withFailureHandler(finish(error => reject(new Error(error.message || "Could not reach the ballot service. Please retry."))));
      if (method === "context") runner.getBallotContext(payload);
      else runner.submitBallot(payload);
    });
  }

  function showError(message) {
    errorPanel.textContent = message;
    errorPanel.hidden = false;
    errorPanel.scrollIntoView({ block: "nearest" });
  }

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
      const context = await rpc("context", candidate);
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
    try {
      const receipt = await rpc("submit", { ...ballot, token, requestId });
      if (!receipt || receipt.submissionId !== requestId || !Number.isFinite(Date.parse(receipt.timestamp))) throw new Error("No valid confirmation received. Retry without changing your ballot to check its status.");
      status.textContent = `${receipt.duplicate ? "Already saved" : "Ballot saved"} at ${receipt.timestamp}. Receipt: ${receipt.submissionId}. Changes can be submitted as a new revision.`;
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
  });

  if (window.google?.script?.run && window.google?.script?.url) {
    form.inert = true;
    status.textContent = "Opening private ballot link…";
    const timer = setTimeout(() => {
      form.inert = false;
      status.textContent = "Couldn’t read the ballot link. Reload to reconnect. Preview JSON is still available.";
    }, 15000);
    google.script.url.getLocation(location => {
      clearTimeout(timer);
      connect(location);
    });
  }
})();
