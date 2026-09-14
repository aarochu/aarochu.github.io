(function () {
  const STORAGE_KEY = "aaron-view";
  const body = document.body;
  const siteView = document.getElementById("site-view");
  const terminalView = document.getElementById("terminal-view");
  const toggleBtn = document.getElementById("view-toggle");
  const toggleLabel = document.getElementById("view-toggle-label");

  function applyView(view) {
    const isTerminal = view === "terminal";
    body.classList.toggle("view-terminal", isTerminal);
    if (siteView) siteView.hidden = isTerminal;
    if (terminalView) terminalView.hidden = !isTerminal;
    if (toggleLabel) toggleLabel.textContent = isTerminal ? "Portfolio View" : "Terminal View";
    if (toggleBtn) toggleBtn.setAttribute("aria-pressed", String(isTerminal));
  }

  function currentView() {
    return body.classList.contains("view-terminal") ? "terminal" : "site";
  }

  const initial = document.documentElement.classList.contains("boot-terminal") ? "terminal" : "site";
  applyView(initial);

  toggleBtn?.addEventListener("click", () => {
    const next = currentView() === "terminal" ? "site" : "terminal";
    applyView(next);
    localStorage.setItem(STORAGE_KEY, next);
    if (next === "terminal") {
      requestAnimationFrame(() => {
        document.getElementById("terminal-input")?.focus();
      });
    }
  });
})();
