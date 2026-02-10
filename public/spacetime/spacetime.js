"use strict";

// ------------------ state ------------------

const objects = [];
let currentRefFrame = null; // null means lab frame

// ------------------ object management ------------------

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
    updateRefFrameSelect();
    render();
}

function removeObject(id) {
    const idx = objects.findIndex(o => o.id === id);
    if (idx !== -1) {
        objects.splice(idx, 1);
        if (currentRefFrame === id) {
            currentRefFrame = null;
        }
        updateObjectList();
        updateRefFrameSelect();
        render();
    }
}

function setRefFrame(id) {
    currentRefFrame = id;
    render();
}

// ------------------ Lorentz transformation ------------------

function gamma(v) {
    return 1 / Math.sqrt(1 - v * v);
}

// Transform coordinates from lab frame to frame moving with velocity v
function lorentzTransform(x, t, v) {
    const g = gamma(v);
    return {
        x: g * (x - v * t),
        t: g * (t - v * x)
    };
}

// Get world line points for an object in current reference frame
function getWorldLine(obj, tMin, tMax, refV) {
    const points = [];
    const steps = 100;
    const dt = (tMax - tMin) / steps;

    for (let i = 0; i <= steps; i++) {
        const tLab = tMin + i * dt;
        // Position in lab frame at time tLab
        const xLab = obj.x + obj.v * tLab;

        if (refV === 0) {
            // Lab frame
            points.push({ x: xLab, t: tLab });
        } else {
            // Transform to moving frame
            const transformed = lorentzTransform(xLab, tLab, refV);
            points.push({ x: transformed.x, t: transformed.t });
        }
    }

    return points;
}

// ------------------ UI updates ------------------

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

function updateRefFrameSelect() {
    if (!refFrameSelect) return;

    refFrameSelect.innerHTML = '<option value="">Lab Frame</option>';

    for (const obj of objects) {
        const option = document.createElement("option");
        option.value = obj.id;
        option.textContent = obj.name;
        if (currentRefFrame === obj.id) {
            option.selected = true;
        }
        refFrameSelect.appendChild(option);
    }
}

// ------------------ canvas ------------------

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

    // Get reference frame velocity
    let refV = 0;
    if (currentRefFrame !== null) {
        const refObj = objects.find(o => o.id === currentRefFrame);
        if (refObj) refV = refObj.v;
    }

    // Calculate visible time range
    const topLeft = screenToWorld(0, 0);
    const bottomRight = screenToWorld(w, h);
    const tMin = bottomRight.t - 1;
    const tMax = topLeft.t + 1;

    // Draw grid
    if (appearance.showGrid) {
        drawGrid(refV);
    }

    // Draw lightcones
    if (appearance.showLightcones) {
        drawLightcones();
    }

    // Draw present line
    if (appearance.showPresent) {
        drawPresentLine();
    }

    // Draw world lines
    for (const obj of objects) {
        const points = getWorldLine(obj, tMin, tMax, refV);
        drawWorldLine(points, obj.color, obj.id === currentRefFrame);
    }

    // Update status
    const refName = currentRefFrame === null ? "Lab" : objects.find(o => o.id === currentRefFrame)?.name || "Lab";
    setStatus(`Spacetime | Frame: ${refName} | Objects: ${objects.length}`);
}

function drawGrid(refV) {
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

    // Draw horizontal lines (constant t in current frame)
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

    // Origin point
    const origin = worldToScreen(0, 0);

    // Calculate cone edges extending to canvas bounds
    const tMax = topLeft.t;
    const tMin = bottomRight.t;
    const xMax = Math.max(Math.abs(topLeft.x), Math.abs(bottomRight.x)) + 10;

    // Future lightcone (t > 0): filled triangle
    ctx.fillStyle = appearance.accentColor + "20"; // ~12% opacity
    ctx.beginPath();
    ctx.moveTo(origin.sx, origin.sy);
    const futureRight = worldToScreen(tMax, tMax);
    const futureLeft = worldToScreen(-tMax, tMax);
    ctx.lineTo(futureRight.sx, futureRight.sy);
    ctx.lineTo(futureLeft.sx, futureLeft.sy);
    ctx.closePath();
    ctx.fill();

    // Past lightcone (t < 0): slightly different shade
    ctx.fillStyle = appearance.accentColor + "15"; // ~8% opacity
    ctx.beginPath();
    ctx.moveTo(origin.sx, origin.sy);
    const pastRight = worldToScreen(-tMin, tMin);
    const pastLeft = worldToScreen(tMin, tMin);
    ctx.lineTo(pastRight.sx, pastRight.sy);
    ctx.lineTo(pastLeft.sx, pastLeft.sy);
    ctx.closePath();
    ctx.fill();
}

function drawWorldLine(points, color, isReference) {
    if (points.length < 2) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = isReference ? 3 : 2;

    ctx.beginPath();
    const first = worldToScreen(points[0].x, points[0].t);
    ctx.moveTo(first.sx, first.sy);

    for (let i = 1; i < points.length; i++) {
        const p = worldToScreen(points[i].x, points[i].t);
        ctx.lineTo(p.sx, p.sy);
    }

    ctx.stroke();
}

// ------------------ pan & zoom ------------------

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
