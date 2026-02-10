"use strict";

// ------------------ init ------------------

function init() {
    initUI();
    resize();

    // Add default object - a rocket moving at 0.5c
    addObject(createObject("Rocket", 0, 0.5, "#ff6b6b"));

    // Event listeners for adding objects
    if (addObjectBtn) {
        addObjectBtn.addEventListener("click", () => {
            const name = objNameInput.value || "Object";
            const x = parseFloat(objXInput.value) || 0;
            const v = parseFloat(objVInput.value) || 0;
            const color = objColorInput.value || "#00ffff";

            // Clamp velocity
            const vClamped = Math.max(-0.999, Math.min(0.999, v));

            addObject(createObject(name, x, vClamped, color));

            // Increment name for next object
            const match = objNameInput.value.match(/^(.+?)(\d*)$/);
            if (match) {
                const base = match[1];
                const num = match[2] ? parseInt(match[2]) + 1 : 2;
                objNameInput.value = base + num;
            }
        });
    }

    render();
}

init();
