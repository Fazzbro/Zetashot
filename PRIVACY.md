# Privacy Policy — OpenShot UI Camera

OpenShot UI Camera was built with a fundamental commitment to user privacy and data ownership.

## 1. 100% Local-First
- **Zero Server Uploads**: We do not upload your screenshots, recordings, browsing history, DOM content, URLs, or project files to any remote server or cloud infrastructure.
- **No Mandatory Accounts**: The tool operates without requiring signups, logins, email addresses, or payment information.
- **Zero Telemetry & Tracking**: There are no Google Analytics, Mixpanel, Sentry, or third-party trackers embedded in the application.

## 2. Local Storage
- All saved projects and capture history items are stored exclusively in your browser's local **IndexedDB** (`openshot_ui_camera_db`).
- You can clear your entire history and project database at any time directly through the UI.

## 3. Browser Permissions
The Chromium extension requests the minimum possible permissions:
- `activeTab`: To capture the visible pixels of the active tab upon your explicit click.
- `scripting`: To coordinate the element picker and calculate scroll height during full-page capture.
- `storage`: To persist local settings.

## 4. Contact
For any questions regarding privacy, please open an issue in the official GitHub repository.
