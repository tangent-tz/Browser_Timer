const { createChromeMock } = require("../mocks/chrome");
const {
    initOnboardingPage,
    getLocaleOverrideFromSearch,
    getModeFromSearch,
    isValidPromotionEntry,
    normalizeLocaleOverride
} = require("../public/onboarding.js");

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
            <section id="updateGuideSection" hidden>
                <h2 id="updateGuideHeading"></h2>
                <p id="updateGuideIntro"></p>
                <ol id="updateGuideSteps"></ol>
                <h3 id="updateGuideTipsHeading"></h3>
                <ul id="updateGuideTips"></ul>
            </section>
            <section id="installGuideSection" hidden>
                <h2 id="installGuideHeading"></h2>
                <p id="installGuideIntro"></p>
                <ol id="installGuideSteps"></ol>
                <h3 id="installGuideTipsHeading"></h3>
                <ul id="installGuideTips"></ul>
                <p id="installGuidePrivacy"></p>
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

    test("should normalize locale override aliases", () => {
        expect(normalizeLocaleOverride("ja")).toBe("ja");
        expect(normalizeLocaleOverride("pt-BR")).toBe("pt_BR");
        expect(normalizeLocaleOverride("pt_BR")).toBe("pt_BR");
        expect(normalizeLocaleOverride("zh-CN")).toBe("zh_CN");
        expect(normalizeLocaleOverride("unknown")).toBe(null);
    });

    test("should parse locale override from query string", () => {
        expect(getLocaleOverrideFromSearch("?mode=install&locale=ja")).toBe("ja");
        expect(getLocaleOverrideFromSearch("?locale=pt-BR")).toBe("pt_BR");
        expect(getLocaleOverrideFromSearch("")).toBe(null);
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
        expect(document.getElementById("installGuideSection").hidden).toBe(false);
        expect(document.getElementById("updateGuideSection").hidden).toBe(true);
        expect(document.querySelectorAll("#installGuideSteps li").length).toBe(6);
        expect(document.querySelectorAll("#installGuideTips li").length).toBe(4);
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
        expect(document.getElementById("installGuideSection").hidden).toBe(true);
        expect(document.getElementById("updateGuideSection").hidden).toBe(false);
        expect(document.querySelectorAll("#whatsNewList li").length).toBe(5);
        expect(document.querySelectorAll("#updateGuideSteps li").length).toBe(6);
        expect(document.querySelectorAll("#updateGuideTips li").length).toBe(4);
    });

    test("renders onboarding in locale override without changing browser language", async () => {
        const fetchImpl = jest.fn(async (url) => {
            if (url.includes("_locales/ja/messages.json")) {
                return {
                    ok: true,
                    json: async () => ({
                        onboardingInstallTitle: {
                            message: "Auto Tab Timer へようこそ"
                        },
                        onboardingInstallSubtitle: {
                            message: "現在のタブにタイマーを設定し、時間切れ時に動作を実行します。"
                        },
                        installGuideHeading: {
                            message: "クイックスタート"
                        },
                        installGuideIntro: {
                            message: "最初のタイマーは数秒で設定できます。"
                        },
                        installGuideStep1: {
                            message: "手順1"
                        },
                        installGuideStep2: {
                            message: "手順2"
                        },
                        installGuideStep3: {
                            message: "手順3"
                        },
                        installGuideStep4: {
                            message: "手順4"
                        },
                        installGuideStep5: {
                            message: "手順5"
                        },
                        installGuideStep6: {
                            message: "手順6"
                        },
                        installGuideTipsHeading: {
                            message: "ヒント"
                        },
                        installGuideTip1: {
                            message: "ヒント1"
                        },
                        installGuideTip2: {
                            message: "ヒント2"
                        },
                        installGuideTip3: {
                            message: "ヒント3"
                        },
                        installGuideTip4: {
                            message: "ヒント4"
                        },
                        installGuidePrivacy: {
                            message: "データはブラウザーに保存されます。"
                        },
                        promoSectionTitle: {
                            message: "このデベロッパーの他の拡張機能"
                        },
                        promoSectionSubtitle: {
                            message: "役立つ追加ツール"
                        },
                        promoUnavailableFallback: {
                            message: "現在おすすめを読み込めません。"
                        },
                        promoDeveloperProfileLink: {
                            message: "すべての拡張機能を見る"
                        }
                    })
                };
            }

            return {
                ok: true,
                json: async () => ({
                    schemaVersion: 1,
                    developerProfile: {
                        chromeUrl: "https://example.com/chrome"
                    },
                    extensions: []
                })
            };
        });

        await initOnboardingPage({
            search: "?mode=install&locale=ja",
            fetchImpl
        });

        expect(document.getElementById("onboardingTitle").textContent).toBe("Auto Tab Timer へようこそ");
        expect(document.getElementById("installGuideHeading").textContent).toBe("クイックスタート");
        expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining("_locales/ja/messages.json"));
    });

    test("falls back to default browser locale when locale override fails", async () => {
        const fetchImpl = jest.fn(async (url) => {
            if (url.includes("_locales/zh_CN/messages.json")) {
                return {
                    ok: false
                };
            }

            return {
                ok: true,
                json: async () => ({
                    schemaVersion: 1,
                    developerProfile: {
                        chromeUrl: "https://example.com/chrome"
                    },
                    extensions: []
                })
            };
        });

        await initOnboardingPage({
            search: "?mode=install&locale=zh-CN",
            fetchImpl
        });

        expect(document.getElementById("onboardingTitle").textContent).toBe("Welcome to Auto Tab Timer");
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
