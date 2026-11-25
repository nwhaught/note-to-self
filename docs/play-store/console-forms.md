# Play Console forms: suggested answers

Answers for the "App content" section (Policy → App content). Re-check them if
the app ever adds networking, accounts, analytics, ads, or crash reporting.

## Privacy policy
URL of the hosted `docs/privacy-policy.md`. Free hosting options:
- **GitHub Pages:** works if the repo is public (or you have GitHub Pro).
  Settings → Pages → deploy from branch `main`, folder `/docs`. The URL becomes
  `https://<user>.github.io/<repo>/privacy-policy`.
- **Google Sites:** paste the text into a new site and publish.

## Ads
**No**, the app does not contain ads.

## App access
**All functionality is available without special access** (no login).

## Content rating (IARC questionnaire)
Category: **Utility, Productivity, Communication, or Other**. Answer "No" to
violence, sexuality, language, controlled substances, gambling, and user
interaction or sharing. Users can't communicate with each other, since notes
stay on device. Expected rating: Everyone / PEGI 3.

## Target audience
**18 and over** (or 13+). Avoid including under-13 age groups: that triggers
the Families policy requirements for no real benefit.

## News app
**No.**

## Data safety
- Does your app collect or share any of the required user data types? **No.**
  - On-device storage isn't "collection" under Google's definition. Only data
    sent off the device counts.
  - Feedback emails are sent by the user from their own email app, not by the
    app, so they aren't collection by the app.
- Is all user data encrypted in transit? Not applicable (no data transmitted).
- Can users request data deletion? Not applicable. Mention that uninstalling or
  "Clear All Data" removes everything.

## Government apps / financial features / health
**No** to all.

## Permissions declarations
None needed. The app no longer declares `USE_EXACT_ALARM`.
`SCHEDULE_EXACT_ALARM` is added by the notifee library's manifest. Play only
requires a declaration for `USE_EXACT_ALARM`. If the Console ever asks about
exact alarms, the honest answer is that the app uses inexact alarms. We can
also strip that permission with a manifest `tools:node="remove"` if it becomes
an issue.
