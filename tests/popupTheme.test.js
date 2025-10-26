const { createChromeMock } = require('../mocks/chrome');

describe('Popup theme manager', () => {
    beforeEach(() => {
        jest.resetModules();
        global.chrome = createChromeMock();

        const popupHtml = `
            <div class="container">
                <button id="tabTimer"></button>
                <button id="tabSettings"></button>
                <div id="timerSection"></div>
                <div id="settingsSection"></div>
                <input id="notificationsToggle" type="checkbox" />
                <input id="hoursInput" />
                <input id="minutesInput" />
                <input id="secondsInput" />
                <button id="startTimerBtn"></button>
                <div id="timersList"></div>
            </div>
        `;
        document.body.innerHTML = popupHtml;

        const themeResponse = {
            colors: {
                frame: '#101010',
                toolbar: '#202020',
                tab_text: '#f0f0f0',
                toolbar_button_icon: '#fafafa'
            }
        };
        chrome.theme.getCurrent.mockImplementation((callback) => callback(themeResponse));
        document.documentElement.style.setProperty = jest.fn();
    });

    test('initialises using chrome.theme APIs when available', async () => {
        require('../src/popup.js');
        document.dispatchEvent(new Event('DOMContentLoaded'));

        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(chrome.theme.getCurrent).toHaveBeenCalled();
        expect(chrome.theme.onUpdated.addListener).toHaveBeenCalledWith(expect.any(Function));
        expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--popup-bg', '#101010');
    });
});
