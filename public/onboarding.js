function getChromeApi() {
    if (typeof chrome !== "undefined") {
        return chrome;
    }
    return null;
}

function getLocalizedMessage(key, substitutions) {
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

async function initOnboardingPage(options) {
    const runtimeOptions = options || {};
    const search = runtimeOptions.search || (typeof window !== "undefined" ? window.location.search : "");
    const fetchImpl = runtimeOptions.fetchImpl || (typeof fetch === "function" ? fetch.bind(window) : null);

    renderIntro(getModeFromSearch(search));

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
        isValidPromotionEntry,
        loadPromoConfig,
        initOnboardingPage
    };
}
