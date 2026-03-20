(function () {
  const desktop = document.getElementById("desktop");
  const tray = document.getElementById("taskbar-tray");
  const clockEl = document.getElementById("taskbar-clock");

  const Z_BASE = 50;
  let zCounter = Z_BASE;

  const defaultLayout = {
    welcome: { left: 120, top: 48, width: 400, height: 320 },
    about: { left: 160, top: 100, width: 440, height: 340 },
    projects: { left: 200, top: 72, width: 640, height: 520 },
    basketball: { left: 140, top: 88, width: 520, height: 440 },
    contact: { left: 220, top: 120, width: 360, height: 260 },
  };

  function staggerOffset(index) {
    return { dx: index * 28, dy: index * 22 };
  }

  function applyDefaultGeometry(win, id, index) {
    const spec = defaultLayout[id];
    if (!spec) return;
    const { dx, dy } = staggerOffset(index);
    win.style.left = `${spec.left + dx}px`;
    win.style.top = `${spec.top + dy}px`;
    win.style.width = `${spec.width}px`;
    win.style.height = `${spec.height}px`;
  }

  function bringToFront(win) {
    zCounter += 1;
    win.style.zIndex = String(zCounter);
  }

  function parsePx(val) {
    const n = parseFloat(val);
    return Number.isFinite(n) ? n : 0;
  }

  function clampWindowToDesktop(win) {
    if (win.classList.contains("maximized") || !desktop) return;
    const rect = desktop.getBoundingClientRect();
    const w = win.offsetWidth;
    const h = win.offsetHeight;
    let left = parsePx(win.style.left);
    let top = parsePx(win.style.top);
    const maxLeft = Math.max(8, rect.width - w - 8);
    const maxTop = Math.max(8, rect.height - h - 8);
    left = Math.min(Math.max(8, left), maxLeft);
    top = Math.min(Math.max(8, top), maxTop);
    win.style.left = `${left}px`;
    win.style.top = `${top}px`;
  }

  function openWindow(id) {
    const win = document.getElementById(`win-${id}`);
    if (!win) return;
    win.hidden = false;
    win.classList.remove("minimized");
    removeTrayItem(id);
    bringToFront(win);
    clampWindowToDesktop(win);
    win.querySelector(".desk-window-body")?.focus?.({ preventScroll: true });
  }

  function closeWindow(win) {
    const id = win.dataset.windowId;
    win.hidden = true;
    win.classList.remove("maximized", "is-dragging", "minimized");
    removeTrayItem(id);
    clearMaxState(win);
    setMaximizeIcon(win, false);
  }

  function clearMaxState(win) {
    delete win.dataset.prevLeft;
    delete win.dataset.prevTop;
    delete win.dataset.prevWidth;
    delete win.dataset.prevHeight;
  }

  function minimizeWindow(win) {
    if (win.classList.contains("maximized")) toggleMaximize(win);
    const id = win.dataset.windowId;
    win.classList.add("minimized");
    win.hidden = true;
    win.classList.remove("is-dragging");
    ensureTrayItem(win, id);
  }

  function restoreFromTray(id) {
    const win = document.querySelector(`.desk-window[data-window-id="${id}"]`);
    if (!win) return;
    win.classList.remove("minimized");
    win.hidden = false;
    removeTrayItem(id);
    bringToFront(win);
    clampWindowToDesktop(win);
  }

  function ensureTrayItem(win, id) {
    let btn = tray.querySelector(`.tray-item[data-tray-id="${id}"]`);
    if (btn) return;
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tray-item";
    btn.dataset.trayId = id;
    btn.textContent = win.querySelector(".desk-window-title")?.textContent?.trim() || id;
    btn.addEventListener("click", () => restoreFromTray(id));
    tray.appendChild(btn);
  }

  function removeTrayItem(id) {
    tray.querySelector(`.tray-item[data-tray-id="${id}"]`)?.remove();
  }

  function setMaximizeIcon(win, maximized) {
    const icon = win.querySelector(".win-btn-max i");
    if (!icon) return;
    icon.classList.remove("fa-window-maximize", "fa-window-restore");
    icon.classList.add(maximized ? "fa-window-restore" : "fa-window-maximize");
  }

  function toggleMaximize(win) {
    if (win.classList.contains("maximized")) {
      win.classList.remove("maximized");
      if (win.dataset.prevLeft != null) {
        win.style.left = win.dataset.prevLeft;
        win.style.top = win.dataset.prevTop;
        win.style.width = win.dataset.prevWidth;
        win.style.height = win.dataset.prevHeight;
      }
      clearMaxState(win);
      setMaximizeIcon(win, false);
    } else {
      win.dataset.prevLeft = win.style.left;
      win.dataset.prevTop = win.style.top;
      win.dataset.prevWidth = win.style.width;
      win.dataset.prevHeight = win.style.height;
      win.classList.add("maximized");
      setMaximizeIcon(win, true);
    }
    clampWindowToDesktop(win);
  }

  /* Drag */
  let dragState = null;

  function onPointerMove(e) {
    if (!dragState) return;
    const { win, startX, startY, origLeft, origTop } = dragState;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    win.style.left = `${origLeft + dx}px`;
    win.style.top = `${origTop + dy}px`;
  }

  function endDrag() {
    if (!dragState) return;
    const { win } = dragState;
    win.classList.remove("is-dragging");
    clampWindowToDesktop(win);
    dragState = null;
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", endDrag);
    document.removeEventListener("pointercancel", endDrag);
  }

  function startDrag(win, e) {
    if (win.classList.contains("maximized")) return;
    if (e.target.closest(".desk-window-controls")) return;
    bringToFront(win);
    win.classList.add("is-dragging");
    dragState = {
      win,
      startX: e.clientX,
      startY: e.clientY,
      origLeft: parsePx(win.style.left) || win.offsetLeft,
      origTop: parsePx(win.style.top) || win.offsetTop,
    };
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", endDrag);
    document.addEventListener("pointercancel", endDrag);
  }

  /* Desktop icons */
  let selectedIcon = null;
  document.querySelectorAll(".desk-icon").forEach((icon) => {
    icon.addEventListener("click", () => {
      if (selectedIcon) selectedIcon.classList.remove("selected");
      icon.classList.add("selected");
      selectedIcon = icon;
    });
    icon.addEventListener("dblclick", () => {
      const id = icon.dataset.window;
      if (id) openWindow(id);
    });
    icon.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const id = icon.dataset.window;
        if (id) openWindow(id);
      }
    });
  });

  /* Windows: controls + drag */
  document.querySelectorAll(".desk-window").forEach((win, index) => {
    const id = win.dataset.windowId;
    applyDefaultGeometry(win, id, index);

    win.querySelector(".win-btn-close")?.addEventListener("click", () => closeWindow(win));
    win.querySelector(".win-btn-min")?.addEventListener("click", () => minimizeWindow(win));
    win.querySelector(".win-btn-max")?.addEventListener("click", () => toggleMaximize(win));

    const titlebar = win.querySelector("[data-drag-handle]");
    titlebar?.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      startDrag(win, e);
    });

    win.addEventListener("pointerdown", () => bringToFront(win));
  });

  window.addEventListener("resize", () => {
    document.querySelectorAll(".desk-window:not([hidden])").forEach(clampWindowToDesktop);
  });

  /* Taskbar clock */
  function tickClock() {
    if (!clockEl) return;
    const d = new Date();
    clockEl.textContent = d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  tickClock();
  setInterval(tickClock, 30_000);
})();
