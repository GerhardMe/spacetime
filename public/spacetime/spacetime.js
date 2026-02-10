"use strict";

// ------------------ Physics Constants ------------------
// Using natural units where c = 1

// ------------------ State ------------------

const objects = [];

// ------------------ Object Management ------------------

function createObject(name, x, v, color) {
    return {
        id: Date.now() + Math.random(),
        name: name,
        x: x,      // position at t=0 in lab frame
        v: v,      // velocity as fraction of c (-1 < v < 1)
        color: color
    };
}

function addObject(obj) {
    objects.push(obj);
    updateObjectList();
    if (typeof updateFrameMatchSelect === "function") updateFrameMatchSelect();
    render();
}

function removeObject(id) {
    const idx = objects.findIndex(o => o.id === id);
    if (idx !== -1) {
        objects.splice(idx, 1);
        updateObjectList();
        if (typeof updateFrameMatchSelect === "function") updateFrameMatchSelect();
        render();
    }
}

// ------------------ Lorentz Transformations ------------------

// Lorentz factor
function gamma(v) {
    if (Math.abs(v) >= 1) return Infinity;
    return 1 / Math.sqrt(1 - v * v);
}

// Transform event (x, t) from lab frame to frame moving at velocity V
function lorentzTransform(x, t, V) {
    const g = gamma(V);
    return {
        x: g * (x - V * t),
        t: g * (t - V * x)
    };
}

// Relativistic velocity addition: velocity u in lab frame -> velocity in frame moving at V
function velocityTransform(u, V) {
    return (u - V) / (1 - u * V);
}

// Get world line in observer's frame for an object defined in lab frame
// Returns two points (sufficient for a straight line)
function getWorldLineInObserverFrame(obj, tPrimeMin, tPrimeMax, observerV) {
    // Object in lab frame: x = obj.x + obj.v * t
    // Observer moves at velocity observerV relative to lab

    // Velocity of object in observer's frame
    const vPrime = velocityTransform(obj.v, observerV);

    // Find where object's world line is at t'=0 in observer's frame
    // This requires finding the lab frame event (x, t) where:
    // 1. x = obj.x + obj.v * t (on object's world line)
    // 2. t' = gamma * (t - observerV * x) = 0
    // From (2): t = observerV * x
    // Substituting into (1): x = obj.x + obj.v * observerV * x
    // x * (1 - obj.v * observerV) = obj.x
    // x = obj.x / (1 - obj.v * observerV)

    const g = gamma(observerV);
    const denominator = 1 - obj.v * observerV;

    if (Math.abs(denominator) < 1e-10) {
        // Edge case: object moving at same velocity as light would in observer's direction
        return [];
    }

    const xLabAtTPrime0 = obj.x / denominator;
    const tLabAtTPrime0 = observerV * xLabAtTPrime0;

    // Transform this point to get x' at t'=0
    const xPrimeAt0 = g * (xLabAtTPrime0 - observerV * tLabAtTPrime0);

    // Now we have: in observer's frame, object is at xPrimeAt0 when t'=0, moving at vPrime
    // World line in observer's frame: x' = xPrimeAt0 + vPrime * t'

    return [
        { x: xPrimeAt0 + vPrime * tPrimeMin, t: tPrimeMin },
        { x: xPrimeAt0 + vPrime * tPrimeMax, t: tPrimeMax }
    ];
}

// Get observer's world line (always vertical at x=0 in their own frame)
function getObserverWorldLine(tPrimeMin, tPrimeMax) {
    return [
        { x: 0, t: tPrimeMin },
        { x: 0, t: tPrimeMax }
    ];
}

// ------------------ UI Updates ------------------

function updateObjectList() {
    if (!objectListEl) return;

    objectListEl.innerHTML = "";

    for (const obj of objects) {
        const item = document.createElement("div");
        item.className = "objectItem";
        item.innerHTML = `
            <div class="name">
                <span class="colorDot" style="background: ${obj.color}"></span>
                <span>${obj.name}</span>
            </div>
            <span class="delete" data-id="${obj.id}">x</span>
        `;
        objectListEl.appendChild(item);
    }

    // Add delete handlers
    objectListEl.querySelectorAll(".delete").forEach(el => {
        el.addEventListener("click", (e) => {
            const id = parseFloat(e.target.dataset.id);
            removeObject(id);
        });
    });
}

// ------------------ Canvas ------------------

let viewCenterX = 0;
let viewCenterT = 2;
let viewScale = 50; // pixels per unit

function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    render();
}

function worldToScreen(x, t) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    return {
        sx: cx + (x - viewCenterX) * viewScale,
        sy: cy - (t - viewCenterT) * viewScale  // y inverted, t goes up
    };
}

function screenToWorld(sx, sy) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    return {
        x: (sx - cx) / viewScale + viewCenterX,
        t: -(sy - cy) / viewScale + viewCenterT
    };
}

function render() {
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, w, h);

    // Get observer's velocity (from frame state in ui.js)
    const observerV = frame.v;

    // Calculate visible time range in observer's frame
    const topLeft = screenToWorld(0, 0);
    const bottomRight = screenToWorld(w, h);
    const tMin = bottomRight.t - 1;
    const tMax = topLeft.t + 1;

    // Draw grid
    if (appearance.showGrid) {
        drawGrid();
    }

    // Draw lightcones
    if (appearance.showLightcones) {
        drawLightcones();
    }

    // Draw present line
    if (appearance.showPresent) {
        drawPresentLine();
    }

    // Draw observer's world line (always vertical at x=0)
    const observerLine = getObserverWorldLine(tMin, tMax);
    drawWorldLine(observerLine, appearance.accentColor, true, "Observer");

    // Draw object world lines
    for (const obj of objects) {
        const points = getWorldLineInObserverFrame(obj, tMin, tMax, observerV);
        drawWorldLine(points, obj.color, false, obj.name);
    }

    // Update status
    setStatus(`Spacetime | v=${observerV.toFixed(2)}c | Objects: ${objects.length}`);
}

function drawGrid() {
    const w = canvas.width;
    const h = canvas.height;

    ctx.strokeStyle = "#222";
    ctx.lineWidth = 1;

    // Get visible range
    const topLeft = screenToWorld(0, 0);
    const bottomRight = screenToWorld(w, h);

    // Draw vertical lines (constant x)
    const xStep = 1;
    const xStart = Math.floor(bottomRight.x / xStep) * xStep;
    const xEnd = Math.ceil(topLeft.x / xStep) * xStep;

    for (let x = xStart; x <= xEnd; x += xStep) {
        const p1 = worldToScreen(x, topLeft.t);
        const p2 = worldToScreen(x, bottomRight.t);
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.stroke();
    }

    // Draw horizontal lines (constant t)
    const tStep = 1;
    const tStart = Math.floor(bottomRight.t / tStep) * tStep;
    const tEnd = Math.ceil(topLeft.t / tStep) * tStep;

    for (let t = tStart; t <= tEnd; t += tStep) {
        const p1 = worldToScreen(bottomRight.x, t);
        const p2 = worldToScreen(topLeft.x, t);
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.stroke();
    }
}

function drawPresentLine() {
    const w = canvas.width;
    const topLeft = screenToWorld(0, 0);
    const bottomRight = screenToWorld(w, 0);

    const t = appearance.presentTime;
    const p1 = worldToScreen(bottomRight.x, t);
    const p2 = worldToScreen(topLeft.x, t);

    ctx.strokeStyle = appearance.accentColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p1.sx, p1.sy);
    ctx.lineTo(p2.sx, p2.sy);
    ctx.stroke();

    // Label
    ctx.fillStyle = appearance.accentColor;
    ctx.font = "12px system-ui";
    ctx.fillText("now", p2.sx + 5, p2.sy - 5);
}

function drawLightcones() {
    const w = canvas.width;
    const h = canvas.height;

    const topLeft = screenToWorld(0, 0);
    const bottomRight = screenToWorld(w, h);

    // Origin at present time, x=0 (observer's position)
    const t0 = appearance.presentTime;
    const origin = worldToScreen(0, t0);

    // Calculate cone edges extending to canvas bounds
    const tMax = topLeft.t;
    const tMin = bottomRight.t;

    // Future lightcone (t > t0): filled triangle
    const futureT = tMax - t0;
    ctx.fillStyle = appearance.accentColor + "20";
    ctx.beginPath();
    ctx.moveTo(origin.sx, origin.sy);
    const futureRight = worldToScreen(futureT, tMax);
    const futureLeft = worldToScreen(-futureT, tMax);
    ctx.lineTo(futureRight.sx, futureRight.sy);
    ctx.lineTo(futureLeft.sx, futureLeft.sy);
    ctx.closePath();
    ctx.fill();

    // Past lightcone (t < t0): slightly different shade
    const pastT = t0 - tMin;
    ctx.fillStyle = appearance.accentColor + "15";
    ctx.beginPath();
    ctx.moveTo(origin.sx, origin.sy);
    const pastRight = worldToScreen(pastT, tMin);
    const pastLeft = worldToScreen(-pastT, tMin);
    ctx.lineTo(pastRight.sx, pastRight.sy);
    ctx.lineTo(pastLeft.sx, pastLeft.sy);
    ctx.closePath();
    ctx.fill();
}

function drawWorldLine(points, color, isObserver, name) {
    if (points.length < 2) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = isObserver ? 3 : 2;

    ctx.beginPath();
    const first = worldToScreen(points[0].x, points[0].t);
    ctx.moveTo(first.sx, first.sy);

    for (let i = 1; i < points.length; i++) {
        const p = worldToScreen(points[i].x, points[i].t);
        ctx.lineTo(p.sx, p.sy);
    }

    ctx.stroke();

    // Draw label where line exits the visible area
    if (name && points.length >= 2) {
        const MARGIN = 6; // Consistent margin in pixels

        const w = canvas.width;
        const h = canvas.height;

        // Get world coordinates of screen edges
        const topLeft = screenToWorld(0, 0);
        const bottomRight = screenToWorld(w, h);

        // Line parameters
        const t0 = points[0].t, t1 = points[1].t;
        const x0 = points[0].x, x1 = points[1].x;
        const dt = t1 - t0;
        const dx = x1 - x0;

        // Helper: interpolate x at given t
        const xAtT = (t) => x0 + dx * (t - t0) / dt;
        // Helper: interpolate t at given x
        const tAtX = (x) => t0 + dt * (x - x0) / dx;

        // Find candidate exit points (where line intersects screen edges)
        const candidates = [];

        // Top edge intersection (t = topLeft.t)
        const xAtTop = xAtT(topLeft.t);
        if (xAtTop >= topLeft.x && xAtTop <= bottomRight.x) {
            candidates.push({ x: xAtTop, t: topLeft.t, edge: "top" });
        }

        // Left edge intersection (x = topLeft.x)
        if (Math.abs(dx) > 1e-10) {
            const tAtLeft = tAtX(topLeft.x);
            if (tAtLeft >= bottomRight.t && tAtLeft <= topLeft.t) {
                candidates.push({ x: topLeft.x, t: tAtLeft, edge: "left" });
            }
        }

        // Right edge intersection (x = bottomRight.x)
        if (Math.abs(dx) > 1e-10) {
            const tAtRight = tAtX(bottomRight.x);
            if (tAtRight >= bottomRight.t && tAtRight <= topLeft.t) {
                candidates.push({ x: bottomRight.x, t: tAtRight, edge: "right" });
            }
        }

        // Pick the highest exit point (largest t = smallest screen y)
        if (candidates.length > 0) {
            candidates.sort((a, b) => b.t - a.t);
            const exit = candidates[0];
            const exitScreen = worldToScreen(exit.x, exit.t);

            ctx.fillStyle = color;
            ctx.font = "bold 11px system-ui";
            const text = `(${name})`;
            const textWidth = ctx.measureText(text).width;

            let labelX, labelY;

            if (exit.edge === "right") {
                // Line exits on right - put label to the left of exit point
                labelX = exitScreen.sx - textWidth - MARGIN;
                labelY = exitScreen.sy + MARGIN + 10; // +10 for text baseline
            } else {
                // Line exits on top or left - put label to the right of exit point
                labelX = exitScreen.sx + MARGIN;
                labelY = exitScreen.sy + MARGIN + 10;
            }

            // Clamp to keep on screen
            labelX = Math.max(MARGIN, Math.min(w - textWidth - MARGIN, labelX));
            labelY = Math.max(MARGIN + 10, Math.min(h - MARGIN, labelY));

            ctx.fillText(text, labelX, labelY);
        }
    }
}

// ------------------ Pan & Zoom ------------------

let isPanning = false;
let lastMouseX = 0;
let lastMouseY = 0;

canvas.addEventListener("pointerdown", (e) => {
    if (e.button === 0) {
        isPanning = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        canvas.setPointerCapture(e.pointerId);
    }
});

canvas.addEventListener("pointermove", (e) => {
    if (!isPanning) return;

    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;

    viewCenterX -= dx / viewScale;
    viewCenterT += dy / viewScale;

    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    render();
});

canvas.addEventListener("pointerup", (e) => {
    isPanning = false;
    canvas.releasePointerCapture(e.pointerId);
});

canvas.addEventListener("wheel", (e) => {
    e.preventDefault();

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    viewScale *= zoomFactor;
    viewScale = Math.max(10, Math.min(500, viewScale));

    render();
});

window.addEventListener("resize", resize);
