const { createChromeMock } = require('../mocks/chrome');
global.chrome = createChromeMock();
describe('Popup - Start Timer functionality', () => {
    beforeEach(() => {
        document.body.innerHTML = `
      <div class="container">
        <h1>Auto Tab Timer</h1>
        <div class="tabs">
          <button id="tabTimer" class="tab active">Timer</button>
          <button id="tabSettings" class="tab">Settings</button>
        </div>
        <div id="timerSection" class="tab-content active">
          <div class="input-group">
            <div class="input-field">
              <label for="hoursInput">Hours</label>
              <input type="number" id="hoursInput" value="0" min="0">
            </div>
            <div class="input-field">
              <label for="minutesInput">Minutes</label>
              <input type="number" id="minutesInput" value="0" min="0">
            </div>
            <div class="input-field">
              <label for="secondsInput">Seconds</label>
              <input type="number" id="secondsInput" value="0" min="0">
            </div>
          </div>
          <button id="startTimerBtn">Start Timer</button>
          <div id="timersList"></div>
        </div>
        <div id="settingsSection" class="tab-content">
          <div class="settings-item">
            <label>
              <input type="checkbox" id="notificationsToggle" checked>
              Enable Notifications
            </label>
          </div>
        </div>
      </div>
    `;

        jest.clearAllMocks();
        require('../src/popup.js');

        document.dispatchEvent(new Event('DOMContentLoaded'));
    });

    test('should send correct timer start message when valid time is provided', () => {
        const hoursInput = document.getElementById('hoursInput');
        const minutesInput = document.getElementById('minutesInput');
        const secondsInput = document.getElementById('secondsInput');
        const startTimerBtn = document.getElementById('startTimerBtn');

        hoursInput.value = '1';
        minutesInput.value = '2';
        secondsInput.value = '3';

        const expectedDuration = 3723;

        const sendMessageSpy = jest.spyOn(chrome.runtime, 'sendMessage');

        startTimerBtn.click();

        expect(sendMessageSpy).toHaveBeenCalledWith(
            { action: 'startTimer', duration: expectedDuration },
            expect.any(Function)
        );
    });
});