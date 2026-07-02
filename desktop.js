(function () {
  const desktop = document.getElementById("desktop");
  const dock = document.getElementById("taskbar-dock");
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
    terminal: "terminal",
  };

  const defaultLayout = {
    welcome: { left: 120, top: 48, width: 400, height: 320 },
    about: { left: 160, top: 100, width: 440, height: 340 },
    projects: { left: 200, top: 72, width: 640, height: 520 },
    basketball: { left: 140, top: 88, width: 520, height: 440 },
    contact: { left: 220, top: 120, width: 360, height: 260 },
    resume: { left: 180, top: 140, width: 640, height: 520 },
    terminal: { left: 480, top: 160, width: 420, height: 280 },
  };

  function isPinnedDock(id) {
    const win = document.getElementById(`win-${id}`);
    return win?.dataset.pinnedDock === "true";
  }

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
    updateDockStates();
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
    delete win.dataset.dockClosed;
    bringToFront(win);
    clampWindowToDesktop(win);
    if (animate) playOpenAnimation(win);
    if (type && id !== "terminal") runTypewriter(win);
    upsertDockItem(id);
    if (id === "terminal") {
      requestAnimationFrame(() => {
        document.getElementById("terminal-input")?.focus();
      });
    }
  }

  function closeWindow(win) {
    const id = win.dataset.windowId;
    win.hidden = true;
    win.classList.remove("maximized", "is-dragging", "minimized", "opening");
    if (isPinnedDock(id)) {
      win.dataset.dockClosed = "1";
      upsertDockItem(id);
    } else {
      removeDockItem(id);
      resetWindowText(win);
    }
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
    delete win.dataset.dockClosed;
    win.classList.add("minimized");
    win.classList.remove("is-dragging");
    upsertDockItem(id);

    const onTransitionEnd = (event) => {
      if (event.target !== win || event.propertyName !== "opacity") return;
      win.hidden = true;
      win.removeEventListener("transitionend", onTransitionEnd);
      updateDockStates();
    };

    win.addEventListener("transitionend", onTransitionEnd);
  }

  function restoreFromTray(id) {
    restoreFromDock(id);
  }

  function getActiveWindowId() {
    let topWin = null;
    let topZ = -1;
    document.querySelectorAll(".desk-window:not([hidden])").forEach((win) => {
      if (win.classList.contains("minimized")) return;
      const z = parseInt(win.style.zIndex, 10) || 0;
      if (z >= topZ) {
        topZ = z;
        topWin = win;
      }
    });
    return topWin?.dataset.windowId || null;
  }

  function updateDockStates() {
    if (!dock) return;
    const activeId = getActiveWindowId();
    dock.querySelectorAll(".dock-item").forEach((btn) => {
      const id = btn.dataset.dockId;
      const win = document.getElementById(`win-${id}`);
      if (!win) return;
      const isVisible = !win.hidden && !win.classList.contains("minimized");
      const isClosed = win.dataset.dockClosed === "1";
      const isMinimized = (win.hidden || win.classList.contains("minimized")) && !isClosed;
      btn.classList.toggle("is-active", id === activeId && isVisible);
      btn.classList.toggle("is-closed", isClosed && win.hidden);
      btn.classList.toggle("is-minimized", isMinimized);
      btn.classList.toggle("is-pinned", isPinnedDock(id));
    });
  }

  function upsertDockItem(id) {
    if (!dock) return;
    let btn = dock.querySelector(`.dock-item[data-dock-id="${id}"]`);
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "dock-item";
      btn.dataset.dockId = id;
      btn.textContent = trayLabels[id] || id;
      btn.addEventListener("click", () => handleDockClick(id));
      dock.appendChild(btn);
    }
    updateDockStates();
  }

  function removeDockItem(id) {
    dock?.querySelector(`.dock-item[data-dock-id="${id}"]`)?.remove();
    updateDockStates();
  }

  function handleDockClick(id) {
    const win = document.getElementById(`win-${id}`);
    if (!win) return;
    if (win.hidden || win.classList.contains("minimized")) {
      restoreFromDock(id);
      return;
    }
    const activeId = getActiveWindowId();
    if (activeId === id) {
      minimizeWindow(win);
    } else {
      bringToFront(win);
      updateDockStates();
    }
  }

  function restoreFromDock(id) {
    const win = document.querySelector(`.desk-window[data-window-id="${id}"]`);
    if (!win) return;
    delete win.dataset.dockClosed;
    win.hidden = false;
    win.classList.add("minimized");
    requestAnimationFrame(() => {
      win.classList.remove("minimized");
    });
    bringToFront(win);
    clampWindowToDesktop(win);
    playOpenAnimation(win);
    if (id !== "terminal" && !win.dataset.typed) runTypewriter(win);
    else if (id !== "terminal") {
      win.querySelectorAll(".reveal-after-type").forEach((el) => {
        el.classList.add("is-visible");
      });
    }
    if (id === "terminal") {
      requestAnimationFrame(() => {
        document.getElementById("terminal-input")?.focus();
      });
    }
    updateDockStates();
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

  /* Boot: show Welcome + terminal on load */
  requestAnimationFrame(() => {
    initTerminal();
    openWindow("welcome");
    openWindow("terminal", { type: false });
  });

  /* ── Shell terminal ── */
  function initTerminal() {
    const output = document.getElementById("terminal-output");
    const form = document.getElementById("terminal-form");
    const input = document.getElementById("terminal-input");
    if (!output || !form || !input) return;

    const appAliases = {
      welcome: "welcome",
      "welcome.sh": "welcome",
      about: "about",
      "about.txt": "about",
      projects: "projects",
      "~/projects": "projects",
      resume: "resume",
      "resume.pdf": "resume",
      basketball: "basketball",
      hoops: "basketball",
      "hoops/": "basketball",
      contact: "contact",
      terminal: "terminal",
    };

    const appList = [
      { id: "welcome", label: "welcome.sh" },
      { id: "about", label: "about.txt" },
      { id: "projects", label: "~/projects" },
      { id: "resume", label: "resume.pdf" },
      { id: "basketball", label: "hoops/" },
      { id: "contact", label: "contact" },
    ];

    const history = [];
    let historyIndex = -1;

    function print(text, className = "") {
      const line = document.createElement("p");
      line.className = `term-line${className ? ` term-line--${className}` : ""}`;
      line.textContent = text;
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    }

    function printBlock(lines, className = "") {
      lines.forEach((line) => print(line, className));
    }

    function resolveApp(name) {
      if (!name) return null;
      return appAliases[name.toLowerCase().replace(/^\.\//, "")] || null;
    }

    function runHelp() {
      printBlock([
        "COMMANDS:",
        "  help                 Show this list",
        "  ls                   List desktop apps",
        "  open <app>           Open an app window",
        "  ./welcome.sh         Open welcome",
        "  cat <file>           Open a file (e.g. cat about.txt)",
        "  close <app>          Close an app window",
        "  close all            Close every window",
        "  clear                Clear terminal output",
        "  whoami               Print my name",
        "  date                 Show date and time",
        "",
        "APPS:",
        "  welcome   about   projects   resume   basketball   contact",
        "",
        "TIPS:",
        "  Double-click desktop icons to open apps",
        "  Drag windows by the title bar",
        "  Click dock buttons on the taskbar to switch windows",
        "  Terminal stays pinned in the dock when closed",
      ], "muted");
    }

    function runLs() {
      appList.forEach(({ label }) => print(label));
    }

    function runCommand(raw) {
      const line = raw.trim();
      if (!line) return;

      print(`$ ${line}`, "cmd");

      const parts = line.split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const arg = parts.slice(1).join(" ");

      if (cmd === "help" || cmd === "?") {
        runHelp();
        return;
      }
      if (cmd === "clear") {
        output.textContent = "";
        return;
      }
      if (cmd === "ls") {
        runLs();
        return;
      }
      if (cmd === "whoami") {
        print("Aaron Chu (初荣恩) — Engineer. Hooper. Barber.");
        return;
      }
      if (cmd === "date") {
        print(new Date().toString());
        return;
      }
      if (cmd === "open") {
        const id = resolveApp(arg);
        if (!id) {
          print(`open: app not found: ${arg || "(none)"}`, "err");
          print("Try: open welcome", "muted");
          return;
        }
        openWindow(id);
        print(`Opened ${trayLabels[id] || id}.`);
        return;
      }
      if (cmd === "cat") {
        const id = resolveApp(arg);
        if (!id) {
          print(`cat: file not found: ${arg || "(none)"}`, "err");
          return;
        }
        openWindow(id);
        print(`Opened ${trayLabels[id] || id}.`);
        return;
      }
      if (cmd === "close") {
        if (arg.toLowerCase() === "all") {
          document.querySelectorAll(".desk-window:not([hidden])").forEach((win) => {
            if (win.dataset.windowId) closeWindow(win);
          });
          print("Closed all windows.");
          return;
        }
        const id = resolveApp(arg);
        if (!id) {
          print(`close: app not found: ${arg || "(none)"}`, "err");
          return;
        }
        const win = document.getElementById(`win-${id}`);
        if (!win || win.hidden) {
          print(`${trayLabels[id] || id} is not open.`, "muted");
          return;
        }
        closeWindow(win);
        print(`Closed ${trayLabels[id] || id}.`);
        return;
      }

      const scriptOpen = resolveApp(cmd.replace(/^\.\//, ""));
      if (scriptOpen && (cmd.startsWith("./") || cmd.endsWith(".sh") || cmd.endsWith(".pdf"))) {
        openWindow(scriptOpen);
        print(`Opened ${trayLabels[scriptOpen] || scriptOpen}.`);
        return;
      }

      const direct = resolveApp(cmd);
      if (direct) {
        openWindow(direct);
        print(`Opened ${trayLabels[direct] || direct}.`);
        return;
      }

      print(`command not found: ${cmd}`, "err");
      print("Type 'help' for available commands.", "muted");
    }

    printBlock([
      "Portfolio OS v1.0 — Aaron Chu",
      "Type 'help' for commands, or 'ls' to list apps.",
    ], "muted");
    runLs();

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const value = input.value;
      input.value = "";
      history.push(value);
      historyIndex = history.length;
      runCommand(value);
      input.focus();
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!history.length) return;
        historyIndex = Math.max(0, historyIndex - 1);
        input.value = history[historyIndex];
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!history.length) return;
        historyIndex = Math.min(history.length, historyIndex + 1);
        input.value = historyIndex === history.length ? "" : history[historyIndex];
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "`" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" && document.activeElement?.id !== "terminal-input") return;
        if (tag === "TEXTAREA") return;
        e.preventDefault();
        const termWin = document.getElementById("win-terminal");
        if (termWin?.hidden) {
          openWindow("terminal", { type: false });
        } else {
          input.focus();
        }
      }
    });

    input.focus();
  }
})();
