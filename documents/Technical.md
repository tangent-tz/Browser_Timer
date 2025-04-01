# System Architecture Document


## 1. Overview

The Auto Tab Timer is a Chrome extension designed to automatically close browser tabs after a user-specified duration. It leverages Chrome Extension APIs for tab management, alarms, notifications, and persistent storage. This document outlines the high-level architecture and component interactions of the system.

---

## 2. High-Level Architecture

The system is organized into two primary layers:

- **User Interface (UI) Layer:**  
  Provides the popup interface for users to set timers, view active timers, and adjust settings.

- **Background Processing Layer:**  
  Handles core timer logic, including starting, pausing, resuming, resetting, and canceling timers. It interacts with Chrome’s alarms, notifications, and storage APIs.

Communication between these layers occurs via Chrome’s messaging system.

---

## 3. Components

### 3.1 Manifest Configuration
- **File:** `manifest.json`
- **Role:**
    - Defines metadata, permissions, and entry points for the extension.
    - Specifies required permissions

### 3.2 Popup Interface
- **Files:** `popup.html`, `popup.css`, `popup.js`
- **Role:**
    - Provides an intuitive UI for setting timers and managing settings.
    - Captures user input and displays active timers.
    - Sends control messages to the background layer.

### 3.3 Background Script
- **File:** `background.js`
- **Role:**
    - Implements the timer management logic (start, pause, resume, reset, cancel).
    - Schedules alarms using Chrome’s alarms API.
    - Manages timer state persistence via `chrome.storage.local`.
    - Triggers notifications and closes tabs when timers expire.

### 3.4 Build Process
- **File:** `webpack.config.js`
- **Role:**
    - Bundles and transpiles JavaScript modules for production.
    - Copies static assets (including manifest and HTML files) into the final build directory.
---

## 4. Data Flow and Component Interaction

1. **User Initiation:**
    - The user interacts with the popup interface to set a timer.

2. **UI to Background Communication:**
    - The popup script sends messages (using Chrome’s messaging API) to the background script with timer commands.

3. **Timer Processing:**
    - The background script receives commands, starts the timer, and saves its state.
    - An alarm is scheduled for the timer’s expiration.
    - On alarm trigger, the background script sends a notification and closes the corresponding tab.

4. **State Updates:**
    - The popup periodically requests the current timer states from the background script to update the UI in real time.

---
---
---

## 6. Flowchart

    flowchart TD
    A[User opens extension popup]
    B[Popup displays Timer and Settings options]
    C{User selects option}
    
    C -- Timer --> D[User selects Timer option]
    C -- Settings --> Y[User selects Settings option]
    
    %% Timer Branch
    D --> E[User enters timer duration]
    E --> F[User clicks Start Timer button]
    F --> G[Timer starts counting down in background]
    G --> H[Popup shows active timer with remaining time]
    H --> I{User action on timer?}
    I -- Pause --> J[User clicks Pause button]
    I -- Resume --> K[User clicks Resume button]
    I -- Reset --> L[User clicks Reset button]
    I -- Cancel --> M[User clicks Cancel button]
    I -- No action --> N[Timer continues normally]
    
    J --> O[Timer pauses; remaining time is saved]
    K --> P[Timer resumes countdown from remaining time]
    L --> Q[Timer resets to original duration and restarts]
    M --> R[Timer is cancelled and removed from system]
    
    N --> S{Has timer expired?}
    S -- Yes --> T[System checks notification setting]
    T --> U{Are notifications enabled?}
    U -- Yes --> V[Show notification to user]
    U -- No --> W[Skip notification]
    V --> X[Close tab automatically]
    W --> X
    S -- No --> N

    %% Settings Branch
    Y --> Z[Popup displays current settings]
    Z --> AA{User makes changes?}
    AA -- Yes --> AB[User adjusts notification and other preferences]
    AA -- No --> AC[Settings remain unchanged]
    AB --> AD[New settings are saved]

---
