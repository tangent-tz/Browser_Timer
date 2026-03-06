const { createChromeMock } = require("../mocks/chrome");
const { initOnboardingPage, getModeFromSearch, isValidPromotionEntry } = require("../public/onboarding.js");

global.chrome = createChromeMock();

function mountOnboardingDom() {
    document.body.innerHTML = `
        <main class="page-shell">
            <header class="hero">
                <h1 id="onboardingTitle"></h1>
                <p id="onboardingSubtitle"></p>
            </header>
            <section id="whatsNewSection" hidden>
                <h2 id="whatsNewHeading"></h2>
                <ul id="whatsNewList"></ul>
            </section>
            <section>
                <h2 id="promoSectionTitle"></h2>
                <p id="promoSectionSubtitle"></p>
                <div id="promoCards"></div>
                <div id="promoFallback" hidden>
                    <span id="promoUnavailableFallback"></span>
                    <a id="promoDeveloperProfileLink"></a>
                </div>
            </section>
        </main>
    `;
}

describe("Onboarding page helpers", () => {
    test("should parse mode from query string", () => {
        expect(getModeFromSearch("?mode=update")).toBe("update");
        expect(getModeFromSearch("?mode=install")).toBe("install");
        expect(getModeFromSearch("")).toBe("install");
    });

    test("should validate promo entry shape", () => {
        expect(
            isValidPromotionEntry({
                id: "promo-id",
                titleKey: "promoExt1Title",
                descriptionKey: "promoExt1Description",
                chromeUrl: "https://example.com"
            })
        ).toBe(true);

        expect(
            isValidPromotionEntry({
                id: "promo-id",
                titleKey: "promoExt1Title"
            })
        ).toBe(false);
    });
});

describe("Onboarding page rendering", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mountOnboardingDom();
    });

    test("renders install mode content and promo cards", async () => {
        const config = {
            schemaVersion: 1,
            developerProfile: {
                chromeUrl: "https://example.com/chrome"
            },
            extensions: [
                {
                    id: "promo-ext-1",
                    titleKey: "promoExt1Title",
                    descriptionKey: "promoExt1Description",
                    chromeUrl: "https://example.com/chrome-one",
                    edgeUrl: "https://example.com/edge-one",
                    iconPath: "icons/icon48.png"
                }
            ]
        };

        await initOnboardingPage({
            search: "?mode=install",
            fetchImpl: jest.fn(async () => ({
                ok: true,
                json: async () => config
            }))
        });

        expect(document.getElementById("onboardingTitle").textContent).toBe("Welcome to Auto Tab Timer");
        expect(document.getElementById("whatsNewSection").hidden).toBe(true);
        expect(document.querySelectorAll(".promo-card").length).toBe(1);
        expect(document.getElementById("promoFallback").hidden).toBe(true);
    });

    test("renders update mode content and highlights", async () => {
        await initOnboardingPage({
            search: "?mode=update&from=1.2.9&to=1.3.0",
            fetchImpl: jest.fn(async () => ({
                ok: true,
                json: async () => ({
                    schemaVersion: 1,
                    developerProfile: {
                        chromeUrl: "https://example.com/chrome"
                    },
                    extensions: []
                })
            }))
        });

        expect(document.getElementById("onboardingTitle").textContent).toBe("What's New in 1.3.0");
        expect(document.getElementById("whatsNewSection").hidden).toBe(false);
        expect(document.querySelectorAll("#whatsNewList li").length).toBe(5);
    });

    test("shows localized fallback when promo config loading fails", async () => {
        await initOnboardingPage({
            search: "?mode=install",
            fetchImpl: jest.fn(async () => {
                throw new Error("network error");
            })
        });

        expect(document.querySelectorAll(".promo-card").length).toBe(0);
        expect(document.getElementById("promoFallback").hidden).toBe(false);
        expect(document.getElementById("promoDeveloperProfileLink").textContent).toBe("View all extensions");
    });
});
