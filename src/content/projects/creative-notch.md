---
title: CreativeNotch
tagline: Turns the MacBook notch into something useful, without the battery drain.
tier: flagship
stack: ["Swift", "SwiftUI", "macOS 26+"]
role: Sole developer
period: 2026 — present
links:
  repo: https://github.com/GcdZ03/CreativeNotch
order: 1
---

## The problem

A notch app is ambient software. It sits under the menu bar for as long as the
machine is on, and almost none of that time is spent looking at it, so its idle
cost is the only cost that matters. The obvious way to build one is continuous:
a global mouse monitor for the cursor, a repeating timer for system stats, an
audio tap for a visualiser. Each is cheap per tick, and none ever stops.

## The constraint

One rule, written down before the first module: no subsystem runs when it isn't
needed, and that rule is enforced centrally rather than trusted to each module.
`ARCHITECTURE.md` names four constructs as not allowed — an unconditional
`Timer`, a permanently installed global event monitor, cursor-position polling,
and an audio tap. The assumption: if you think you need one, there is a
notification you have not found yet.

## What that forced

It decided most of the app. Hover is an `NSTrackingArea` on the panel, so
nothing runs while the cursor is elsewhere. Battery and Low Power Mode come from
`IOPSNotificationCreateRunLoopSource`. The global shortcut goes through Carbon's
`RegisterEventHotKey`, which hands the combination to the window server, so
nothing runs between presses. The capture indicator, which lights when another
app is using your camera or microphone, listens for the
`DeviceIsRunningSomewhere` property on CoreAudio and CoreMediaIO devices instead
of asking every few seconds.

Launch at login follows the same idea from another direction. The switch reads
`SMAppService` every time rather than remembering an answer, so turning the
login item off in System Settings shows up as off: there is no stored flag left
to disagree with the system.

The rule is checkable rather than asserted. The source tree holds exactly one
repeating `Timer`, the clipboard poller, because `NSPasteboard` genuinely has no
change notification. It backs off after two quiet minutes and suspends while the
screen is locked or the machine is asleep. There is exactly one
`addGlobalMonitorForEvents`, installed only while the panel is open.

## What it cost

A working feature. Volume and brightness in the notch shipped in v0.2.0, ran for
a month, and came out in v0.7.0. Nothing was broken — its last bug had been
fixed the day before. But it needed a permanently installed `CGEventTap` for the
media keys, which was the one exception to the rule, and that tap was the only
reason the app asked for Accessibility. Removing it took 3,397 lines out and put
428 back. Now the rule has no asterisk, and first launch asks for nothing. The
only prompt left is the camera's, and that one appears only the first time you
open the camera.

Lifecycle correctness, which I underestimated. Refusing to poll makes every
subsystem a registration, and every registration has to be undone. Three
modules shipped a `stop()` that forgot something `start()` had registered: the
boolean flipped, the module looked stopped, and the listener leaked. Reading the
code caught none of them. Exposing a registration count and asserting on it did,
and every observer is now built that way.

Features, deliberately. There is no audio visualiser and there won't be, because
the rule names the audio tap outright. The now-playing badge is a static album
cover, because an equaliser would redraw for as long as music plays.

Avoiding a poll can cost more than polling. Since macOS 15.4, Now Playing
metadata is gated by code-signing identifier, which an ad-hoc-signed app can't
satisfy, so the app runs a helper through the system's own `/usr/bin/perl` and
reads JSON back. A supervised subprocess is heavier than a timer. It starts only
while the machine is awake and unlocked.

## The result

v0.7.0: a file shelf, media controls, clipboard history, battery, a timer, a
camera mirror and the capture indicator. Each one can be switched off, and
switching it off stops what it runs rather than hiding it. That lives in one
`ModuleSwitchboard`. The core target imports only Foundation, CoreGraphics and
Observation, which is what lets the geometry, state machine and peek arbitration
run headlessly in CI — 974 tests in about two seconds.
