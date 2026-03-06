function getChromeApi() {
    if (typeof chrome !== "undefined") {
        return chrome;
    }
    return null;
}

const SUPPORTED_DEBUG_LOCALES = new Set([
    "en",
    "es",
    "de",
    "fr",
    "ja",
    "pt_BR",
    "zh_CN"
]);

let localeOverrideMessages = null;

function applySubstitutions(message, substitutions) {
    if (!message || substitutions === undefined || substitutions === null) {
        return message || "";
    }

    const values = Array.isArray(substitutions) ? substitutions : [substitutions];
    return values.reduce((result, value, index) => {
        const pattern = new RegExp(`\\$${index + 1}\\$`, "g");
        return result.replace(pattern, String(value));
    }, message);
}

function getLocalizedMessage(key, substitutions) {
    if (localeOverrideMessages && localeOverrideMessages[key] && typeof localeOverrideMessages[key].message === "string") {
        return applySubstitutions(localeOverrideMessages[key].message, substitutions);
    }

    const chromeApi = getChromeApi();
    if (!chromeApi || !chromeApi.i18n || typeof chromeApi.i18n.getMessage !== "function") {
        return "";
    }
    const message = chromeApi.i18n.getMessage(key, substitutions);
    return message || "";
}

function getModeFromSearch(search) {
    const query = new URLSearchParams(search || "");
    return query.get("mode") === "update" ? "update" : "install";
}

function normalizeLocaleOverride(rawLocale) {
    if (!rawLocale || typeof rawLocale !== "string") {
        return null;
    }

    const normalized = rawLocale.trim().replace(/-/g, "_");
    if (!normalized) {
        return null;
    }

    const lowerCaseLocale = normalized.toLowerCase();
    if (lowerCaseLocale === "pt_br") {
        return "pt_BR";
    }
    if (lowerCaseLocale === "zh_cn") {
        return "zh_CN";
    }
    if (SUPPORTED_DEBUG_LOCALES.has(lowerCaseLocale)) {
        return lowerCaseLocale;
    }
    if (SUPPORTED_DEBUG_LOCALES.has(normalized)) {
        return normalized;
    }

    return null;
}

function getLocaleOverrideFromSearch(search) {
    const query = new URLSearchParams(search || "");
    return normalizeLocaleOverride(query.get("locale"));
}

function isValidPromotionEntry(entry) {
    return Boolean(
        entry
        && typeof entry.id === "string"
        && typeof entry.titleKey === "string"
        && typeof entry.descriptionKey === "string"
        && (entry.chromeUrl || entry.edgeUrl)
    );
}

function buildLink(labelKey, url) {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = getLocalizedMessage(labelKey) || url;
    return link;
}

function renderIntro(mode) {
    const titleNode = document.getElementById("onboardingTitle");
    const subtitleNode = document.getElementById("onboardingSubtitle");
    const whatsNewSection = document.getElementById("whatsNewSection");
    const whatsNewHeading = document.getElementById("whatsNewHeading");
    const whatsNewList = document.getElementById("whatsNewList");

    if (!titleNode || !subtitleNode || !whatsNewSection || !whatsNewHeading || !whatsNewList) {
        return;
    }

    if (mode === "update") {
        whatsNewList.innerHTML = "";
        titleNode.textContent = getLocalizedMessage("onboardingUpdateTitle");
        subtitleNode.textContent = getLocalizedMessage("onboardingUpdateSubtitle");
        whatsNewHeading.textContent = getLocalizedMessage("whatsNew130Heading");
        const items = [
            "whatsNew130Item1",
            "whatsNew130Item2",
            "whatsNew130Item3",
            "whatsNew130Item4",
            "whatsNew130Item5"
        ];
        items.forEach((key) => {
            const itemText = getLocalizedMessage(key);
            if (!itemText) {
                return;
            }
            const li = document.createElement("li");
            li.textContent = itemText;
            whatsNewList.appendChild(li);
        });
        whatsNewSection.hidden = false;
        return;
    }

    titleNode.textContent = getLocalizedMessage("onboardingInstallTitle");
    subtitleNode.textContent = getLocalizedMessage("onboardingInstallSubtitle");
    whatsNewSection.hidden = true;
}

function renderInstallGuide(mode) {
    const section = document.getElementById("installGuideSection");
    const heading = document.getElementById("installGuideHeading");
    const intro = document.getElementById("installGuideIntro");
    const stepsList = document.getElementById("installGuideSteps");
    const tipsHeading = document.getElementById("installGuideTipsHeading");
    const tipsList = document.getElementById("installGuideTips");
    const privacy = document.getElementById("installGuidePrivacy");

    if (!section || !heading || !intro || !stepsList || !tipsHeading || !tipsList || !privacy) {
        return;
    }

    stepsList.innerHTML = "";
    tipsList.innerHTML = "";

    if (mode === "update") {
        section.hidden = true;
        return;
    }

    heading.textContent = getLocalizedMessage("installGuideHeading");
    intro.textContent = getLocalizedMessage("installGuideIntro");

    const stepKeys = [
        "installGuideStep1",
        "installGuideStep2",
        "installGuideStep3",
        "installGuideStep4",
        "installGuideStep5",
        "installGuideStep6"
    ];
    stepKeys.forEach((key) => {
        const text = getLocalizedMessage(key);
        if (!text) {
            return;
        }
        const li = document.createElement("li");
        li.textContent = text;
        stepsList.appendChild(li);
    });

    tipsHeading.textContent = getLocalizedMessage("installGuideTipsHeading");
    const tipKeys = [
        "installGuideTip1",
        "installGuideTip2",
        "installGuideTip3",
        "installGuideTip4"
    ];
    tipKeys.forEach((key) => {
        const text = getLocalizedMessage(key);
        if (!text) {
            return;
        }
        const li = document.createElement("li");
        li.textContent = text;
        tipsList.appendChild(li);
    });

    privacy.textContent = getLocalizedMessage("installGuidePrivacy");
    section.hidden = false;
}

function renderUpdateGuide(mode) {
    const section = document.getElementById("updateGuideSection");
    const heading = document.getElementById("updateGuideHeading");
    const intro = document.getElementById("updateGuideIntro");
    const stepsList = document.getElementById("updateGuideSteps");
    const tipsHeading = document.getElementById("updateGuideTipsHeading");
    const tipsList = document.getElementById("updateGuideTips");

    if (!section || !heading || !intro || !stepsList || !tipsHeading || !tipsList) {
        return;
    }

    stepsList.innerHTML = "";
    tipsList.innerHTML = "";

    if (mode !== "update") {
        section.hidden = true;
        return;
    }

    heading.textContent = getLocalizedMessage("updateGuideHeading");
    intro.textContent = getLocalizedMessage("updateGuideIntro");

    const stepKeys = [
        "updateGuideStep1",
        "updateGuideStep2",
        "updateGuideStep3",
        "updateGuideStep4",
        "updateGuideStep5",
        "updateGuideStep6"
    ];
    stepKeys.forEach((key) => {
        const text = getLocalizedMessage(key);
        if (!text) {
            return;
        }
        const li = document.createElement("li");
        li.textContent = text;
        stepsList.appendChild(li);
    });

    tipsHeading.textContent = getLocalizedMessage("updateGuideTipsHeading");
    const tipKeys = [
        "updateGuideTip1",
        "updateGuideTip2",
        "updateGuideTip3",
        "updateGuideTip4"
    ];
    tipKeys.forEach((key) => {
        const text = getLocalizedMessage(key);
        if (!text) {
            return;
        }
        const li = document.createElement("li");
        li.textContent = text;
        tipsList.appendChild(li);
    });

    section.hidden = false;
}

function renderPromoFallback(config) {
    const fallback = document.getElementById("promoFallback");
    const fallbackText = document.getElementById("promoUnavailableFallback");
    const profileLink = document.getElementById("promoDeveloperProfileLink");

    if (!fallback || !fallbackText || !profileLink) {
        return;
    }

    fallbackText.textContent = getLocalizedMessage("promoUnavailableFallback");
    profileLink.textContent = getLocalizedMessage("promoDeveloperProfileLink");
    const profileUrl = config && config.developerProfile
        ? (config.developerProfile.chromeUrl || config.developerProfile.edgeUrl || "#")
        : "#";
    profileLink.href = profileUrl;
    fallback.hidden = false;
}

function renderPromoCards(config) {
    const sectionTitle = document.getElementById("promoSectionTitle");
    const sectionSubtitle = document.getElementById("promoSectionSubtitle");
    const cardsContainer = document.getElementById("promoCards");
    const fallback = document.getElementById("promoFallback");

    if (!sectionTitle || !sectionSubtitle || !cardsContainer || !fallback) {
        return;
    }

    sectionTitle.textContent = getLocalizedMessage("promoSectionTitle");
    sectionSubtitle.textContent = getLocalizedMessage("promoSectionSubtitle");

    if (!config || !Array.isArray(config.extensions)) {
        renderPromoFallback(config);
        return;
    }

    const validEntries = config.extensions.filter(isValidPromotionEntry);

    if (validEntries.length === 0) {
        renderPromoFallback(config);
        return;
    }

    fallback.hidden = true;
    validEntries.forEach((entry) => {
        const card = document.createElement("article");
        card.className = "promo-card";

        const header = document.createElement("div");
        header.className = "promo-card-header";

        const icon = document.createElement("img");
        icon.src = entry.iconPath || "icons/icon48.png";
        icon.alt = "";

        const title = document.createElement("h3");
        title.className = "promo-card-title";
        title.textContent = getLocalizedMessage(entry.titleKey) || entry.id;

        header.appendChild(icon);
        header.appendChild(title);

        const description = document.createElement("p");
        description.className = "promo-card-description";
        description.textContent = getLocalizedMessage(entry.descriptionKey);

        const links = document.createElement("div");
        links.className = "promo-links";
        if (entry.chromeUrl) {
            links.appendChild(buildLink("promoOpenChromeStore", entry.chromeUrl));
        }
        if (entry.edgeUrl) {
            links.appendChild(buildLink("promoOpenEdgeStore", entry.edgeUrl));
        }

        card.appendChild(header);
        card.appendChild(description);
        card.appendChild(links);
        cardsContainer.appendChild(card);
    });
}

async function loadPromoConfig(fetchImpl) {
    const chromeApi = getChromeApi();
    const configUrl = chromeApi && chromeApi.runtime && typeof chromeApi.runtime.getURL === "function"
        ? chromeApi.runtime.getURL("promoted-extensions.json")
        : "promoted-extensions.json";

    const response = await fetchImpl(configUrl);
    if (!response || !response.ok) {
        throw new Error("Failed to load promoted extensions config");
    }
    return response.json();
}

async function loadLocaleOverride(fetchImpl, locale) {
    if (!fetchImpl || !locale) {
        return null;
    }

    const chromeApi = getChromeApi();
    const localeUrl = chromeApi && chromeApi.runtime && typeof chromeApi.runtime.getURL === "function"
        ? chromeApi.runtime.getURL(`_locales/${locale}/messages.json`)
        : `_locales/${locale}/messages.json`;

    const response = await fetchImpl(localeUrl);
    if (!response || !response.ok) {
        throw new Error(`Failed to load locale override: ${locale}`);
    }

    return response.json();
}

async function initOnboardingPage(options) {
    const runtimeOptions = options || {};
    const search = runtimeOptions.search || (typeof window !== "undefined" ? window.location.search : "");
    const mode = getModeFromSearch(search);
    const localeOverride = getLocaleOverrideFromSearch(search);
    const fetchImpl = runtimeOptions.fetchImpl || (typeof fetch === "function" ? fetch.bind(window) : null);

    localeOverrideMessages = null;
    if (localeOverride && fetchImpl) {
        try {
            localeOverrideMessages = await loadLocaleOverride(fetchImpl, localeOverride);
        } catch (error) {
            localeOverrideMessages = null;
        }
    }

    renderIntro(mode);
    renderInstallGuide(mode);
    renderUpdateGuide(mode);

    if (!fetchImpl) {
        renderPromoFallback(null);
        return;
    }

    try {
        const config = await loadPromoConfig(fetchImpl);
        renderPromoCards(config);
    } catch (error) {
        renderPromoFallback(null);
    }
}

if (typeof window !== "undefined") {
    window.addEventListener("DOMContentLoaded", () => {
        initOnboardingPage();
    });
}

if (typeof module !== "undefined") {
    module.exports = {
        getModeFromSearch,
        getLocaleOverrideFromSearch,
        isValidPromotionEntry,
        loadPromoConfig,
        initOnboardingPage,
        normalizeLocaleOverride
    };
}
