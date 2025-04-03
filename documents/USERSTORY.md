# Detailed User Story: Auto-Close Tabs with Timer

## Title: Automatically Close Tabs with a Timer

### Narrative
As someone who enjoys watching videos or browsing content to help me fall asleep, I sometimes want my browser to automatically close tabs after a set duration. This feature not only helps me avoid distractions late at night but also ensures that tabs aren’t left open accidentally, saving system resources and maintaining a tidy browsing environment.

---

## User Story

**As a** user who watches videos or browses content to help me sleep,  
**I want** to set a custom timer on my browser tabs,  
**so that** the tab automatically closes after the specified time, allowing me to relax without worrying about manually closing the tab.

---

## Acceptance Criteria

- **Easy Timer Setup:**  
  - The tool provides a simple, intuitive interface where I can quickly input a time duration (in hours, minutes, and seconds).
  - I can easily start the timer on the active tab without complicated steps.

- **Real-Time Feedback:**  
  - Once a timer is set, I can see the countdown on the interface, allowing me to know exactly when the tab will close.
  - Active timers are clearly listed, showing the tab’s title and the remaining time.

- **Control Options:**  
  - I have the ability to pause, resume, reset, or cancel a timer if my plans change.
  - The interface updates immediately to reflect any changes to the timer’s state.

- **Automatic Closure and Notifications:**  
  - When the countdown reaches zero, the tool automatically closes the corresponding tab.
  - Optionally, I receive a notification that the timer has finished before the tab is closed, so I’m aware of what’s happening.

- **Customization:**  
  - I can adjust settings such as enabling or disabling notifications according to my preferences.
  - These settings (enable/disable notifications) are saved so that my choices remain consistent across browsing sessions.

---

## Workflow and Detailed Requirements

1. **Accessing the Timer Feature:**  
   - **User Action:** I click the extension’s icon in my browser toolbar.  
   - **Expected Outcome:** A popup interface appears with two primary sections: one for setting timers and another for adjusting settings.

2. **Setting Up a Timer:**  
   - I navigate to the Timer section where I enter a desired time duration—for example, 45 minutes for a bedtime video.  
   - I click the "Start Timer" button, and the tool captures the details of the current tab and begins the countdown.

3. **Managing Active Timers:**  
   - **Viewing Active Timers:** I can see a list of timers with details like the tab title and the remaining time.  
   - **Control Actions:**  
     - I can pause the timer if I want to delay the closure, with the tool recording the remaining time.  
     - I can resume the timer, and the countdown continues from where it left off.  
     - I have the option to reset the timer back to the originally set duration.  
     - I can cancel the timer entirely if I decide to keep the tab open.

4. **Tab Closure and Notifications:**  
   - When the timer expires, I receive a brief notification alerting me that the time is up.  
   - Immediately after the notification, the tool automatically closes the tab, ensuring I’m not left with an open tab when I’m trying to sleep.

5. **User Preferences:**  
   - In the Settings section, I can choose whether to have notifications enabled or disabled, based on my personal preference.
   - My preferences are saved so that the tool fits seamlessly into my browsing experience.

---