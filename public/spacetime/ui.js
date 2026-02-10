"use strict";

// ------------------ DOM refs ------------------

const canvas = document.getElementById("view");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");

const objNameInput = document.getElementById("objName");
const objXInput = document.getElementById("objX");
const objVInput = document.getElementById("objV");
const objColorInput = document.getElementById("objColor");
const addObjectBtn = document.getElementById("addObject");
const objectListEl = document.getElementById("objectList");
const refFrameSelect = document.getElementById("refFrame");

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

// ------------------ Status ------------------

function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
}

// ------------------ Init UI ------------------

function initUI() {
    // Register all panels
    registerPanel("objects");
    registerPanel("style");

    // Setup behavior for each
    for (const entry of panels) {
        setupPanelBehavior(entry);
    }

    // Initial layout
    layoutPanels();
}
