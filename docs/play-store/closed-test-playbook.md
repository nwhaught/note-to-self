# Closed test playbook (12 testers × 14 days)

Personal developer accounts created after 13 Nov 2023 must run a closed test
with **at least 12 testers opted in continuously for the 14 days before you
apply** for production access. Source:
https://support.google.com/googleplay/android-developer/answer/14151465

## The rules that trip people up

- **Only the Closed testing track counts.** Internal testing does not.
- **The clock starts at opt-in, not at install.** It must be 14 *consecutive*
  days. Opting out and back in restarts that tester's clock.
- **Google looks backwards from the day you apply.** You need ≥12 testers who
  are opted in *that day* and were opted in for the 14 days before it.
- **Same Google account.** Testers must opt in with the account signed into
  the Play Store on their phone. People with several Gmail accounts get this
  wrong.
- **Android only.** iPhone users can't help.
- **Recruit 18–20**, so a few dropping out doesn't sink you.

## Before inviting anyone

- [x] Final application ID set: `com.yox.notetoself` (can't change after the first upload)
- [ ] Upload key created and backed up ([RELEASING.md](../release/RELEASING.md))
- [x] Feedback email set: contact.yox@gmail.com
- [ ] Privacy policy hosted, URL in Console
- [ ] App content forms done ([console-forms.md](console-forms.md))
- [ ] Store listing drafted ([store-listing.md](store-listing.md)). Closed
      tests need a listing too
- [ ] Create a **Google Group** (e.g. `notetoself-testers@googlegroups.com`) and
      add it as the tester list. Adding people to a group is easier than editing
      email lists in the Console
- [ ] Upload the `.aab` to Closed testing, roll out, and wait for the review
      (often 1–3 days). Testers can only opt in after it's approved

## Invite message (copy, fill in, send)

> Hi! I'm launching a small Android app called Note to Self. You write short
> notes to yourself, and it sends them back as notifications at random times
> through the day. Before Google lets me publish it, I need people to test it
> for two weeks. Would you help?
>
> 1. Join this group with the Google account you use for the Play Store:
>    [GROUP LINK]
> 2. Open this link on your phone and tap "Become a tester":
>    [OPT-IN LINK]
> 3. Install it from the Play Store, add 3–5 notes, and allow notifications.
> 4. **Please don't opt out or leave the group for at least 14 days.** Even if
>    you stop using it, staying opted in is what counts.
>
> If a reminder doesn't show up, or anything's confusing, use Settings → Send
> Feedback. It's a big help. Thanks!

## During the 14 days

- **Day 0:** note the date. Count opted-in testers in Console (Closed testing →
  Testers). Target ≥15.
- **Day 2–3:** check in with anyone who joined the group but didn't opt in or
  install.
- **Day 5–8:** ship at least one update based on feedback (bump the version,
  `bundleRelease`, upload). Google looks for an app that's being actively
  improved.
- **Day 10:** brief check-in message: "Halfway there, anything annoying?"
- **Every few days:** check the opted-in count. If it drops toward 12, recruit
  more now. A new tester needs their own 14 days.

## Feedback log

Keep this up as you go. The production-access questionnaire asks about tester
engagement, the feedback you got, and what you changed. Concrete entries here
make those answers easy and convincing.

| Date | Tester (initials) | Device | Feedback / issue | Action taken | Version |
|------|-------------------|--------|------------------|--------------|---------|
|      |                   |        |                  |              |         |

## Applying for production

When the Console shows the requirement met, Dashboard → **Apply for
production**. Answer specifically, e.g.:

- *How did you recruit testers?* Friends and family with a range of Android
  phones (Samsung, Pixel, Motorola…), invited through a Google Group.
- *How did testers engage?* The app delivers notes several times a day, so
  testers received notifications daily. N testers sent feedback through the
  in-app feedback button.
- *What did you change?* List the real fixes from the log above, by version.

Review usually takes ≤7 days. If Google says more testing is needed, keep
testers opted in, ship another improvement, and reapply.
