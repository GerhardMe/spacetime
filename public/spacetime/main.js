"use strict";

// ------------------ init ------------------

function init() {
    initUI();
    resize();

    // Add default objects
    addObject(createObject("Observer", 0, 0, "#ffffff"));
    addObject(createObject("Rocket", 1, 0.5, "#ff6b6b"));

    // Event listeners
    if (addObjectBtn) {
        addObjectBtn.addEventListener("click", () => {
            const name = objNameInput.value || "Object";
            const x = parseFloat(objXInput.value) || 0;
            const v = parseFloat(objVInput.value) || 0;
            const color = objColorInput.value || "#00ffff";

            // Clamp velocity
            const vClamped = Math.max(-0.99, Math.min(0.99, v));

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

    if (refFrameSelect) {
        refFrameSelect.addEventListener("change", (e) => {
            const val = e.target.value;
            setRefFrame(val === "" ? null : parseFloat(val));
        });
    }

    render();
}

init();
