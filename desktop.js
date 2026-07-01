(function () {
  const desktop = document.getElementById("desktop");
  const tray = document.getElementById("taskbar-tray");
  const clockEl = document.getElementById("taskbar-clock");

  const Z_BASE = 50;
  let zCounter = Z_BASE;
  const typingTokens = new WeakMap();

  const trayLabels = {
    welcome: "welcome.sh",
    resume: "resume.pdf",
    about: "about.txt",
    projects: "~/projects",
    basketball: "hoops/",
    contact: "contact",
  };

  const defaultLayout = {
    welcome: { left: 120, top: 48, width: 400, height: 320 },
    about: { left: 160, top: 100, width: 440, height: 340 },
    projects: { left: 200, top: 72, width: 640, height: 520 },
    basketball: { left: 140, top: 88, width: 520, height: 440 },
    contact: { left: 220, top: 120, width: 360, height: 260 },
    resume: { left: 180, top: 140, width: 640, height: 520 },
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

  /* ── Typewriter ── */
  function isTypeTarget(el) {
    if (!el.matches("h1, h2, h3, p, .type-prompt")) return false;
    if (el.closest("iframe, video, .contact-buttons, .project-grid, .basketball-highlights")) {
      if (!el.closest(".project-card")) return false;
    }
    return true;
  }

  function prepareTypeTargets(win) {
    win.querySelectorAll(".win-section h1, .win-section h2, .win-section h3, .win-section p, .type-prompt").forEach((el) => {
      if (!isTypeTarget(el)) return;
      if (!el.dataset.typeText) {
        el.dataset.typeText = el.textContent.trim();
        el.dataset.typeHtml = el.innerHTML;
      }
    });
  }

  function cancelTyping(win) {
    const token = typingTokens.get(win);
    if (token) token.cancelled = true;
    typingTokens.delete(win);
  }

  function resetWindowText(win) {
    cancelTyping(win);
    win.querySelectorAll("[data-type-text]").forEach((el) => {
      el.textContent = "";
      el.classList.remove("typing", "typed");
    });
    win.querySelectorAll(".reveal-after-type").forEach((el) => {
      el.classList.remove("is-visible");
    });
    delete win.dataset.typed;
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function typeElement(el, token, speed = 16) {
    return new Promise((resolve) => {
      const text = el.dataset.typeText || "";
      const html = el.dataset.typeHtml;
      el.textContent = "";
      el.classList.add("typing");

      const cursor = document.createElement("span");
      cursor.className = "type-cursor";
      cursor.textContent = "█";
      el.appendChild(cursor);

      let i = 0;
      const step = () => {
        if (token.cancelled) {
          cursor.remove();
          resolve();
          return;
        }
        if (i < text.length) {
          cursor.before(document.createTextNode(text[i]));
          i += 1;
          setTimeout(step, speed + Math.random() * 14);
        } else {
          cursor.remove();
          el.classList.remove("typing");
          el.classList.add("typed");
          if (html && html !== text) el.innerHTML = html;
          resolve();
        }
      };
      step();
    });
  }

  async function runTypewriter(win) {
    cancelTyping(win);
    const token = { cancelled: false };
    typingTokens.set(win, token);

    prepareTypeTargets(win);
    win.querySelectorAll(".reveal-after-type").forEach((el) => {
      el.classList.remove("is-visible");
    });

    const body = win.querySelector(".desk-window-body");
    const targets = [...body.querySelectorAll(".type-prompt, h1, h2, h3, p")].filter(isTypeTarget);

    for (const el of targets) {
      if (token.cancelled) return;
      const text = el.dataset.typeText || "";
      let speed = 14;
      if (el.matches("h1, h2")) speed = 24;
      else if (el.matches("h3")) speed = 18;
      else if (text.length > 120) speed = 5;
      else if (el.matches(".type-prompt")) speed = 28;
      await typeElement(el, token, speed);
      await delay(80);
    }

    if (!token.cancelled) {
      win.querySelectorAll(".reveal-after-type").forEach((el) => {
        el.classList.add("is-visible");
      });
      win.dataset.typed = "1";
    }
    typingTokens.delete(win);
  }

  function playOpenAnimation(win) {
    win.classList.remove("opening");
    void win.offsetWidth;
    win.classList.add("opening");
    win.addEventListener(
      "animationend",
      () => win.classList.remove("opening"),
      { once: true }
    );
  }

  function openWindow(id, { type = true, animate = true } = {}) {
    const win = document.getElementById(`win-${id}`);
    if (!win) return;
    win.hidden = false;
    win.classList.remove("minimized");
    removeTrayItem(id);
    bringToFront(win);
    clampWindowToDesktop(win);
    if (animate) playOpenAnimation(win);
    if (type) runTypewriter(win);
  }

  function closeWindow(win) {
    const id = win.dataset.windowId;
    win.hidden = true;
    win.classList.remove("maximized", "is-dragging", "minimized", "opening");
    removeTrayItem(id);
    clearMaxState(win);
    setMaximizeIcon(win, false);
    resetWindowText(win);
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
    win.classList.remove("is-dragging");
    ensureTrayItem(win, id);

    const onTransitionEnd = (event) => {
      if (event.target !== win || event.propertyName !== "opacity") return;
      win.hidden = true;
      win.removeEventListener("transitionend", onTransitionEnd);
    };

    win.addEventListener("transitionend", onTransitionEnd);
  }

  function restoreFromTray(id) {
    const win = document.querySelector(`.desk-window[data-window-id="${id}"]`);
    if (!win) return;
    win.hidden = false;
    win.classList.add("minimized");
    requestAnimationFrame(() => {
      win.classList.remove("minimized");
    });
    removeTrayItem(id);
    bringToFront(win);
    clampWindowToDesktop(win);
    playOpenAnimation(win);
    if (!win.dataset.typed) runTypewriter(win);
    else {
      win.querySelectorAll(".reveal-after-type").forEach((el) => {
        el.classList.add("is-visible");
      });
    }
  }

  function ensureTrayItem(win, id) {
    let btn = tray.querySelector(`.tray-item[data-tray-id="${id}"]`);
    if (btn) return;
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tray-item";
    btn.dataset.trayId = id;
    btn.textContent = trayLabels[id] || id;
    btn.addEventListener("click", () => restoreFromTray(id));
    tray.appendChild(btn);
  }

  function removeTrayItem(id) {
    tray.querySelector(`.tray-item[data-tray-id="${id}"]`)?.remove();
  }

  function setMaximizeIcon(win, maximized) {
    win.querySelector(".win-btn-max")?.classList.toggle("is-maximized", maximized);
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
    prepareTypeTargets(win);

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

  /* Boot: show Welcome on load */
  requestAnimationFrame(() => {
    openWindow("welcome");
  });
})();
