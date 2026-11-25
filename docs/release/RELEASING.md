# Releasing Note to Self

## One-time: create the upload key

Play uses two keys. **Play App Signing** holds the key that signs what users
download; you only hold the **upload key**, which proves an upload came from you.
If the upload key is ever lost, Google can reset it. That's why it's worth
enrolling in Play App Signing (the default for new apps).

1. Generate the key (run from any folder **outside** the repo). Pick strong passwords
   and store them in your password manager:

   ```
   "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair -v ^
     -keystore notetoself-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Move `notetoself-upload.jks` somewhere safe (e.g. `C:\Users\<you>\keys\`) and
   **back it up** (password manager attachment or encrypted cloud storage).
   `*.jks`/`*.keystore` files are git-ignored. Never commit them.

3. Add to `%USERPROFILE%\.gradle\gradle.properties` (create it if missing). This
   file is per-user and never part of the repo:

   ```
   NOTETOSELF_UPLOAD_STORE_FILE=C:/Users/<you>/keys/notetoself-upload.jks
   NOTETOSELF_UPLOAD_STORE_PASSWORD=...
   NOTETOSELF_UPLOAD_KEY_ALIAS=upload
   NOTETOSELF_UPLOAD_KEY_PASSWORD=...
   ```

Without these properties, release builds fall back to the debug key and Gradle
prints a warning. That's fine for sideloading onto your own phone, but Play
rejects debug-signed bundles.

## Every release

1. **Bump the version** in `package.json` (`"version": "1.0.1"`). That one field
   drives the Android `versionName`, the `versionCode` (`1.0.1` → `10001`), and
   the version shown in Settings. Play requires a higher `versionCode` on every
   upload. Keep each part of the version below 100.
2. Run tests: `npm test`
3. Build the bundle:
   ```
   cd android
   ./gradlew bundleRelease
   ```
   Output: `android/app/build/outputs/bundle/release/app-release.aab`
4. Upload the `.aab` in Play Console under the track you're releasing to
   (Testing → Closed testing for now), add release notes, and roll out.

## Sideloaded vs Play installs

Android only lets an app update over an install signed with the same key, and
backups are tied to the application ID. So:

- Builds before the rename used `com.notetoself`. That install is a different
  app from `com.yox.notetoself` and won't hand its notes over. The two can sit
  side by side while you copy notes across.
- Sideloaded release builds are debug-signed and Play installs are signed with
  Google's key, so switching a phone from a sideloaded build to the Play build
  needs an uninstall. Within the same application ID, Android backup restores
  the notes after reinstalling (Settings → Google → Backup → Back up now first).

## Transferring to an organization account later

Google supports transferring apps between developer accounts. The application
ID, users, ratings, and reviews move with the app. Users don't need to
reinstall, and the signing key stays with Play App Signing. Do it before you
start charging if you want the organization's details, not yours, on the
listing.
