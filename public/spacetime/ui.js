"use strict";

// ------------------ DOM refs ------------------

const canvas = document.getElementById("view");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");

// Display controls
const accentColorInput = document.getElementById("accentColor");
const showLightconesInput = document.getElementById("showLightcones");
const showGridInput = document.getElementById("showGrid");
const showPresentInput = document.getElementById("showPresent");
const presentTimeInput = document.getElementById("presentTime");

// Display state (will be synced from DOM on init)
const appearance = {
    accentColor: "#00ffff",
    showLightcones: false,
    showGrid: false,
    showPresent: true,
    presentTime: 0
};

function syncAppearanceFromDOM() {
    if (accentColorInput) appearance.accentColor = accentColorInput.value;
    if (showLightconesInput) appearance.showLightcones = showLightconesInput.checked;
    if (showGridInput) appearance.showGrid = showGridInput.checked;
    if (showPresentInput) appearance.showPresent = showPresentInput.checked;
    if (presentTimeInput) appearance.presentTime = parseFloat(presentTimeInput.value) || 0;
}

const objNameInput = document.getElementById("objName");
const objXInput = document.getElementById("objX");
const objVInput = document.getElementById("objV");
const objColorInput = document.getElementById("objColor");
const addObjectBtn = document.getElementById("addObject");
const objectListEl = document.getElementById("objectList");

// Frame controls
const frameVInput = document.getElementById("frameV");
const frameXInput = document.getElementById("frameX");
const frameMatchSelect = document.getElementById("frameMatch");

// Frame state
const frame = {
    v: 0,
    x: 0
};

// ------------------ Panel Framework ------------------

const panels = [];
const PANEL_MARGIN = 16;
const PANEL_GAP = 10;
const STATUSBAR_HEIGHT = 32;

function registerPanel(id) {
    const capitalId = id.charAt(0).toUpperCase() + id.slice(1);
    const panel = document.getElementById(id + "Panel");
    const header = document.getElementById(id + "Header");
    const toggleBtn = document.getElementById(capitalId + "Btn");

    if (!panel) return null;

    const entry = {
        id,
        panel,
        header,
        toggleBtn,
        minimized: false
    };

    panels.push(entry);
    return entry;
}

function getPanelEntry(id) {
    return panels.find(p => p.id === id);
}

function setPanelMinimized(id, minimized) {
    const entry = getPanelEntry(id);
    if (!entry) return;

    entry.minimized = minimized;
    entry.panel.classList.toggle("minimized", minimized);

    if (entry.toggleBtn) {
        entry.toggleBtn.classList.toggle("accentColor", minimized);
    }
}

function isPanelMinimized(id) {
    const entry = getPanelEntry(id);
    return entry ? entry.minimized : true;
}

function togglePanel(id) {
    setPanelMinimized(id, !isPanelMinimized(id));
}

// ------------------ Panel Positioning ------------------

function layoutPanels() {
    const viewWidth = window.innerWidth;
    let x = PANEL_MARGIN;
    let y = STATUSBAR_HEIGHT + PANEL_MARGIN;
    let rowHeight = 0;

    for (const entry of panels) {
        const panel = entry.panel;

        // Temporarily show to measure
        const wasHidden = panel.classList.contains("minimized");
        panel.style.visibility = "hidden";
        panel.classList.remove("minimized");

        const rect = panel.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        // Restore hidden state
        if (wasHidden) {
            panel.classList.add("minimized");
        }
        panel.style.visibility = "";

        // Wrap to next row if needed
        if (x + width + PANEL_MARGIN > viewWidth && x > PANEL_MARGIN) {
            x = PANEL_MARGIN;
            y += rowHeight + PANEL_GAP;
            rowHeight = 0;
        }

        // Position panel
        panel.style.left = x + "px";
        panel.style.top = y + "px";
        panel.style.right = "auto";

        x += width + PANEL_GAP;
        rowHeight = Math.max(rowHeight, height);
    }
}

// ------------------ Draggable ------------------

function setupDraggable(entry) {
    const { panel, header } = entry;
    if (!panel || !header) return;

    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    header.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        if (e.target.closest(".appMinimize")) return;

        dragging = true;
        header.setPointerCapture(e.pointerId);
        const rect = panel.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
    });

    function endDrag(e) {
        if (!dragging) return;
        dragging = false;
        try {
            header.releasePointerCapture(e.pointerId);
        } catch (_) {}
    }

    window.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        panel.style.left = (e.clientX - offsetX) + "px";
        panel.style.top = (e.clientY - offsetY) + "px";
        panel.style.right = "auto";
    });

    header.addEventListener("pointerup", endDrag);
    header.addEventListener("pointercancel", endDrag);
}

// ------------------ Setup ------------------

function setupPanelBehavior(entry) {
    setupDraggable(entry);

    // Minimize button in header
    const minBtn = entry.header?.querySelector(".appMinimize");
    if (minBtn) {
        minBtn.addEventListener("click", () => {
            setPanelMinimized(entry.id, true);
        });
    }

    // Toggle button in status bar
    if (entry.toggleBtn) {
        entry.toggleBtn.addEventListener("click", () => {
            togglePanel(entry.id);
        });
    }
}

// ------------------ Appearance ------------------

function updateAccentColor(color) {
    appearance.accentColor = color;
    document.documentElement.style.setProperty("--accent-color", color);

    // Update all accentColor elements
    document.querySelectorAll(".accentColor").forEach(el => {
        el.style.borderColor = color;
        el.style.color = color;
    });

    if (typeof render === "function") render();
}

function setupAppearance() {
    // Sync initial state from DOM
    syncAppearanceFromDOM();

    // Apply initial accent color
    updateAccentColor(appearance.accentColor);

    if (accentColorInput) {
        accentColorInput.addEventListener("input", (e) => {
            updateAccentColor(e.target.value);
        });
    }

    if (showLightconesInput) {
        showLightconesInput.addEventListener("change", (e) => {
            appearance.showLightcones = e.target.checked;
            if (typeof render === "function") render();
        });
    }

    if (showGridInput) {
        showGridInput.addEventListener("change", (e) => {
            appearance.showGrid = e.target.checked;
            if (typeof render === "function") render();
        });
    }

    if (showPresentInput) {
        showPresentInput.addEventListener("change", (e) => {
            appearance.showPresent = e.target.checked;
            if (typeof render === "function") render();
        });
    }

    if (presentTimeInput) {
        presentTimeInput.addEventListener("input", (e) => {
            appearance.presentTime = parseFloat(e.target.value) || 0;
            if (typeof render === "function") render();
        });
    }
}

// ------------------ Frame ------------------

function syncFrameFromDOM() {
    if (frameVInput) frame.v = parseFloat(frameVInput.value) || 0;
    if (frameXInput) frame.x = parseFloat(frameXInput.value) || 0;
}

function updateFrameMatchSelect() {
    if (!frameMatchSelect) return;

    const currentVal = frameMatchSelect.value;
    frameMatchSelect.innerHTML = '<option value="">-- Select --</option>';

    if (typeof objects !== "undefined") {
        for (const obj of objects) {
            const option = document.createElement("option");
            option.value = obj.id;
            option.textContent = obj.name;
            frameMatchSelect.appendChild(option);
        }
    }

    frameMatchSelect.value = currentVal;
}

function matchFrameToObject(id) {
    if (typeof objects === "undefined") return;

    const obj = objects.find(o => o.id === id);
    if (!obj) return;

    frame.v = obj.v;
    frame.x = obj.x;

    if (frameVInput) frameVInput.value = frame.v;
    if (frameXInput) frameXInput.value = frame.x;

    if (typeof render === "function") render();
}

function setupFrame() {
    syncFrameFromDOM();

    if (frameVInput) {
        frameVInput.addEventListener("input", (e) => {
            frame.v = parseFloat(e.target.value) || 0;
            frame.v = Math.max(-0.999, Math.min(0.999, frame.v));
            if (typeof render === "function") render();
        });
    }

    if (frameXInput) {
        frameXInput.addEventListener("input", (e) => {
            frame.x = parseFloat(e.target.value) || 0;
            if (typeof render === "function") render();
        });
    }

    if (frameMatchSelect) {
        frameMatchSelect.addEventListener("change", (e) => {
            if (e.target.value) {
                matchFrameToObject(parseFloat(e.target.value));
                e.target.value = ""; // Reset dropdown
            }
        });
    }
}

// ------------------ Status ------------------

function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
}

// ------------------ Init UI ------------------

function initUI() {
    // Register all panels (order determines layout position)
    registerPanel("display");
    registerPanel("observer");
    registerPanel("objects");

    // Setup behavior for each
    for (const entry of panels) {
        setupPanelBehavior(entry);
    }

    // Setup controls
    setupAppearance();
    setupFrame();

    // Initial layout
    layoutPanels();
}
