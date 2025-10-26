const POPUP_THEME_STORAGE_KEY = "popupThemeVariables";

const POPUP_CSS_VARIABLES = {
    frame: "--popup-bg",
    toolbar: "--popup-surface",
    tab_text: "--text-color",
    toolbar_button_icon: "--button-icon"
};

function createThemeManager() {
    const root = document.documentElement;
    let listenerRegistered = false;

    const readCachedVariables = () => new Promise((resolve) => {
        try {
            chrome.storage.local.get(POPUP_THEME_STORAGE_KEY, (data) => {
                resolve(data?.[POPUP_THEME_STORAGE_KEY] || null);
            });
        } catch (error) {
            console.warn("Failed to read cached popup theme", error);
            resolve(null);
        }
    });

    const persistVariables = (variables) => new Promise((resolve) => {
        try {
            chrome.storage.local.set({ [POPUP_THEME_STORAGE_KEY]: variables }, () => resolve());
        } catch (error) {
            console.warn("Failed to persist popup theme", error);
            resolve();
        }
    });

    const applyVariables = (variables) => {
        if (!variables) return;
        Object.entries(variables).forEach(([cssVar, value]) => {
            if (value) {
                root.style.setProperty(cssVar, value);
            }
        });
    };

    const normalizeColor = (color) => {
        if (!color && color !== 0) return null;
        if (Array.isArray(color)) {
            const [r = 0, g = 0, b = 0, a = 255] = color;
            return rgbToCss({ r, g, b, a: clampAlpha(a / 255) });
        }
        if (typeof color === "string") {
            return color;
        }
        return null;
    };

    const fetchTheme = () => new Promise((resolve) => {
        if (chrome.theme?.getCurrent) {
            try {
                chrome.theme.getCurrent((theme) => {
                    if (theme && Object.keys(theme).length) {
                        resolve(theme);
                        return;
                    }
                    resolve(null);
                });
                return;
            } catch (error) {
                console.warn("chrome.theme.getCurrent failed", error);
            }
        }
        if (chrome.management?.getAll) {
            try {
                chrome.management.getAll((items) => {
                    const themeInfo = items?.find((item) => item.type === "theme" && item.enabled && item.theme);
                    resolve(themeInfo?.theme || null);
                });
                return;
            } catch (error) {
                console.warn("chrome.management.getAll failed", error);
            }
        }
        resolve(null);
    });

    const deriveVariables = (theme) => {
        const defaults = getDefaultPalette();
        const colors = theme?.colors || theme || {};

        const baseColors = Object.fromEntries(
            Object.entries(POPUP_CSS_VARIABLES).map(([themeKey]) => [
                themeKey,
                normalizeColor(colors?.[themeKey]) || defaults[themeKey]
            ])
        );

        const background = baseColors.frame || defaults.frame;
        const surface = baseColors.toolbar || shadeColor(background, 0.06);
        const textColor = ensureReadableColor(background, baseColors.tab_text || defaults.tab_text);
        const buttonIconColor = ensureReadableColor(surface, baseColors.toolbar_button_icon || textColor);
        const buttonBackground = shadeColor(surface, -0.18);
        const borderColor = shadeColor(surface, -0.25);

        return {
            [POPUP_CSS_VARIABLES.frame]: background,
            [POPUP_CSS_VARIABLES.toolbar]: surface,
            [POPUP_CSS_VARIABLES.tab_text]: textColor,
            [POPUP_CSS_VARIABLES.toolbar_button_icon]: buttonIconColor,
            "--button-bg": buttonBackground,
            "--button-text": ensureReadableColor(buttonBackground, textColor),
            "--border-color": borderColor
        };
    };

    const refreshTheme = async (explicitTheme = null) => {
        const themeData = explicitTheme || await fetchTheme();
        const variables = deriveVariables(themeData);
        applyVariables(variables);
        await persistVariables(variables);
    };

    const handleThemeUpdate = (updateInfo) => {
        const updatedTheme = updateInfo?.theme || null;
        refreshTheme(updatedTheme).catch((error) => {
            console.error("Failed to refresh popup theme", error);
        });
    };

    const registerListener = () => {
        if (listenerRegistered) return;
        if (chrome.theme?.onUpdated?.addListener) {
            chrome.theme.onUpdated.addListener(handleThemeUpdate);
            listenerRegistered = true;
        }
    };

    const init = async () => {
        try {
            const cached = await readCachedVariables();
            if (cached) {
                applyVariables(cached);
            }
            await refreshTheme();
        } catch (error) {
            console.error("Failed to initialise popup theme", error);
        } finally {
            registerListener();
        }
    };

    return { init };
}

const clampAlpha = (value) => {
    if (Number.isNaN(value)) return 1;
    return Math.min(1, Math.max(0, value));
};

const rgbToCss = ({ r, g, b, a = 1 }) => {
    if (a < 1) {
        return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${Number(a.toFixed(3))})`;
    }
    return rgbToHex(Math.round(r), Math.round(g), Math.round(b));
};

const rgbToHex = (r, g, b) => {
    const componentToHex = (c) => {
        const hex = c.toString(16);
        return hex.length === 1 ? `0${hex}` : hex;
    };
    return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
};

const parseColorToRgb = (color) => {
    if (!color) return null;
    if (Array.isArray(color)) {
        const [r = 0, g = 0, b = 0, a = 1] = color;
        return { r, g, b, a: clampAlpha(a) };
    }
    if (typeof color === "string") {
        const hexMatch = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
        if (hexMatch) {
            let hex = hexMatch[1];
            if (hex.length === 3) {
                hex = hex.split("").map((char) => `${char}${char}`).join("");
            }
            const intVal = parseInt(hex, 16);
            return {
                r: (intVal >> 16) & 255,
                g: (intVal >> 8) & 255,
                b: intVal & 255,
                a: 1
            };
        }
        const rgbaMatch = color.trim().match(/^rgba?\(([^)]+)\)$/i);
        if (rgbaMatch) {
            const parts = rgbaMatch[1].split(/\s*,\s*/).map(Number);
            const [r = 0, g = 0, b = 0, a = 1] = parts;
            return { r, g, b, a: clampAlpha(a) };
        }
    }
    return null;
};

const luminance = ({ r, g, b }) => {
    const transform = (c) => {
        const channel = c / 255;
        return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
};

const contrastRatio = (colorA, colorB) => {
    const lumA = luminance(colorA);
    const lumB = luminance(colorB);
    const brightest = Math.max(lumA, lumB);
    const darkest = Math.min(lumA, lumB);
    return (brightest + 0.05) / (darkest + 0.05);
};

const getReadableTextColor = (background) => {
    const bg = parseColorToRgb(background);
    if (!bg) return "#000000";
    return luminance(bg) > 0.4 ? "#1a1a1a" : "#f5f5f5";
};

const ensureReadableColor = (background, candidate, fallbackBackground = null, preferInverse = false) => {
    const bg = parseColorToRgb(background);
    if (!bg) {
        return candidate || getReadableTextColor(fallbackBackground || background);
    }
    if (!candidate) {
        return getReadableTextColor(background);
    }
    const candidateRgb = parseColorToRgb(candidate);
    if (!candidateRgb) {
        return candidate;
    }
    if (contrastRatio(bg, candidateRgb) < 4.5) {
        if (preferInverse) {
            const inverted = rgbToCss({
                r: 255 - candidateRgb.r,
                g: 255 - candidateRgb.g,
                b: 255 - candidateRgb.b,
                a: candidateRgb.a
            });
            const invertedRgb = parseColorToRgb(inverted);
            if (invertedRgb && contrastRatio(bg, invertedRgb) >= 4.5) {
                return inverted;
            }
        }
        return getReadableTextColor(background);
    }
    return rgbToCss(candidateRgb);
};

const shadeColor = (color, percent) => {
    const rgb = parseColorToRgb(color);
    if (!rgb) return color;
    const t = percent < 0 ? 0 : 255;
    const p = Math.abs(percent);
    const r = Math.round((t - rgb.r) * p + rgb.r);
    const g = Math.round((t - rgb.g) * p + rgb.g);
    const b = Math.round((t - rgb.b) * p + rgb.b);
    return rgbToCss({ r, g, b, a: rgb.a });
};

const getDefaultPalette = () => {
    const mediaQuery = typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;
    const prefersDark = mediaQuery ? mediaQuery.matches : false;
    if (prefersDark) {
        return {
            frame: "#202124",
            toolbar: "#2d2f33",
            tab_text: "#e8eaed",
            toolbar_button_icon: "#f1f3f4"
        };
    }
    return {
        frame: "#ffffff",
        toolbar: "#f1f3f4",
        tab_text: "#202124",
        toolbar_button_icon: "#3c4043"
    };
};

const themeManager = createThemeManager();

document.addEventListener("DOMContentLoaded", () => {
    themeManager.init().catch((error) => {
        console.error("Theme manager failed to initialise", error);
    });
    // Tab switching logic:
    const tabTimer = document.getElementById("tabTimer");
    const tabSettings = document.getElementById("tabSettings");
    const timerSection = document.getElementById("timerSection");
    const settingsSection = document.getElementById("settingsSection");
    const notificationsToggle = document.getElementById("notificationsToggle");

    // Initialize notifications toggle state:
    chrome.storage.sync.get("notificationsEnabled", (data) => {
        notificationsToggle.checked = data.notificationsEnabled !== false;
    });
    notificationsToggle.addEventListener("change", () => {
        chrome.storage.sync.set({ notificationsEnabled: notificationsToggle.checked });
    });

    tabTimer.addEventListener("click", () => {
        tabTimer.classList.add("active");
        tabSettings.classList.remove("active");
        timerSection.classList.add("active");
        settingsSection.classList.remove("active");
    });
    tabSettings.addEventListener("click", () => {
        tabSettings.classList.add("active");
        tabTimer.classList.remove("active");
        settingsSection.classList.add("active");
        timerSection.classList.remove("active");
    });

    // Timer elements:
    const hoursInput = document.getElementById("hoursInput");
    const minutesInput = document.getElementById("minutesInput");
    const secondsInput = document.getElementById("secondsInput");
    const startTimerBtn = document.getElementById("startTimerBtn");
    const timersList = document.getElementById("timersList");

    // Start a new timer when button is clicked.
    startTimerBtn.addEventListener("click", () => {
        const h = parseInt(hoursInput.value, 10) || 0;
        const m = parseInt(minutesInput.value, 10) || 0;
        const s = parseInt(secondsInput.value, 10) || 0;
        const totalSeconds = h * 3600 + m * 60 + s;
        if (totalSeconds <= 0) {
            console.warn("Please enter a valid time greater than 0.");
            return;
        }
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]) {
                console.warn("No active tab found");
                return;
            }
            const tab = tabs[0];
            const tabId = tab.id;
            const tabUrl = tab.url;
            const tabTitle = tab.title || `Tab ${tabId}`;
            const tabFavicon = tab.favIconUrl || "icons/timer.svg";
            if (tabUrl === "chrome://newtab/" || tabUrl === "edge://newtab/") {
                return;
            }
            chrome.runtime.sendMessage({
                action: "startTimer",
                duration: totalSeconds,
                tabFavicon,
                tabTitle,
                tabId
            }, (response) => {
                console.log("Timer started:", response);
            });
        });
    });


    function formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }

    function createTimerCard(timer) {
        // Determine the remaining time.
        let remaining;
        if (timer.paused && timer.remaining !== undefined) {
            remaining = timer.remaining;
        } else if (timer.targetTime) {
            remaining = Math.max(0, Math.floor((timer.targetTime - Date.now()) / 1000));
        } else {
            remaining = timer.originalDuration;
        }

        // Calculate progress as a percentage.
        const elapsed = timer.originalDuration - remaining;
        const percentage = (elapsed / timer.originalDuration) * 100;

        // Create the card container.
        const card = document.createElement("div");
        card.className = "timer-card";

        // 1) Header: Icon, tab title.
        const header = document.createElement("div");
        header.className = "timer-card-header";
        const icon = document.createElement("img");
        // Use the stored tab favicon; if missing, default to your timer icon.
        icon.src = timer.tabFavicon || "icons/timer.svg";
        icon.alt = "Tab Icon";
        icon.className = "timer-thumbnail";
        const titleSpan = document.createElement("span");
        titleSpan.className = "timer-title";
        titleSpan.textContent = timer.tabTitle;
        header.appendChild(icon);
        header.appendChild(titleSpan);
        card.appendChild(header);

        // 2) Status row: Label and Running/Paused text
        const statusRow = document.createElement("div");
        statusRow.className = "timer-status-row";
        const statusLabel = document.createElement("span");
        statusLabel.className = "status-label";
        statusLabel.textContent = "Status:";
        const statusText = document.createElement("span");
        statusText.className = "status-text";
        statusText.textContent = timer.paused ? "Paused" : "Running";
        statusRow.appendChild(statusLabel);
        statusRow.appendChild(statusText);
        card.appendChild(statusRow);

        // 3) Progress bar.
        const progressContainer = document.createElement("div");
        progressContainer.className = "timer-progress";
        const progressBar = document.createElement("div");
        progressBar.className = "progress-bar";
        progressBar.style.width = percentage + "%";
        progressContainer.appendChild(progressBar);
        card.appendChild(progressContainer);

        // 4) Remaining time row.
        const remainingRow = document.createElement("div");
        remainingRow.className = "timer-remaining-row";
        const remainingLabel = document.createElement("span");
        remainingLabel.className = "remaining-label";
        remainingLabel.textContent = "Remaining:";
        const remainingValue = document.createElement("span");
        remainingValue.className = "remaining-value";
        remainingValue.textContent = formatTime(remaining);
        remainingRow.appendChild(remainingLabel);
        remainingRow.appendChild(remainingValue);
        card.appendChild(remainingRow);

        // 5) Control buttons: Pause/Resume, Reset, Cancel.
        const controls = document.createElement("div");
        controls.className = "timer-controls";
        const pauseResumeBtn = document.createElement("button");
        pauseResumeBtn.setAttribute("data-timerid", timer.timerId);
        if (timer.paused) {
            pauseResumeBtn.className = "resume-btn";
            pauseResumeBtn.textContent = "Resume";
        } else {
            pauseResumeBtn.className = "pause-btn";
            pauseResumeBtn.textContent = "Pause";

        }
        const resetBtn = document.createElement("button");
        resetBtn.className = "reset-btn";
        resetBtn.textContent = "Reset";
        resetBtn.setAttribute("data-timerid", timer.timerId);
        const cancelBtn = document.createElement("button");
        cancelBtn.className = "cancel-btn";
        cancelBtn.textContent = "Cancel";
        cancelBtn.setAttribute("data-timerid", timer.timerId);

        controls.appendChild(pauseResumeBtn);
        controls.appendChild(resetBtn);
        controls.appendChild(cancelBtn);
        card.appendChild(controls);

        return card;
    }
    // Update the timers list UI every second.
    function updateTimersList() {
        chrome.runtime.sendMessage({ action: "getTimers" }, (resp) => {
            if (!resp || !resp.timers) return;
            timersList.innerHTML = "";
            resp.timers.forEach(timer => {
                const timerCard = createTimerCard(timer);
                timersList.appendChild(timerCard);
            });

            // Reassign event listeners for control buttons.
            document.querySelectorAll(".pause-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    const timerId = btn.getAttribute("data-timerid");
                    chrome.runtime.sendMessage({ action: "pauseTimer", timerId }, (resp) => {
                        console.log(resp.status);
                    });
                });
            });
            document.querySelectorAll(".resume-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    const timerId = btn.getAttribute("data-timerid");
                    chrome.runtime.sendMessage({ action: "resumeTimer", timerId }, (resp) => {
                        console.log(resp.status);
                    });
                });
            });
            document.querySelectorAll(".reset-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    const timerId = btn.getAttribute("data-timerid");
                    chrome.runtime.sendMessage({ action: "resetTimer", timerId }, (resp) => {
                        console.log(resp.status);
                    });
                });
            });
            document.querySelectorAll(".cancel-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    const timerId = btn.getAttribute("data-timerid");
                    chrome.runtime.sendMessage({ action: "cancelTimer", timerId }, (resp) => {
                        console.log(resp.status);
                    });
                });
            });
        });
    }
    setInterval(updateTimersList, 1000);
});
