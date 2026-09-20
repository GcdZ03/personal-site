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

It decided most of the app. Hover is an `NSTrackingArea` on the panel, not a
global mouse monitor, so nothing runs while the cursor is elsewhere. Volume
comes from CoreAudio property listeners on the default output device — the
value, not the keypress, so it catches Control Center and Siri. Brightness has
no public API at all, so it goes through the DisplayServices change notification
via `dlsym`. Battery and Low Power Mode come from
`IOPSNotificationCreateRunLoopSource`. The global shortcut uses Carbon's
`RegisterEventHotKey`, which hands the combination to the window server: nothing
runs between presses, and it needs no Accessibility permission.

The result is checkable rather than asserted. The source tree holds exactly one
repeating `Timer` — the clipboard poller, because `NSPasteboard` genuinely has
no change notification. It runs at 0.75s, backs off to 3s after two quiet
minutes, floors at 2s in Low Power Mode, and suspends while the screen is locked
or the machine is asleep. There is one `addGlobalMonitorForEvents`, installed
only while the panel is open. And one permanently installed listener: a
`CGEventTap` for the media keys, so the notch stays silent when Apple's own HUD
is already showing. It is admitted in the spec rather than overlooked.

## What it cost

Features. No audio visualiser, and there never will be — the rule names the
audio tap outright, so it sits on the roadmap as excluded, not pending. The
now-playing badge is a static album cover, because an equaliser redraws for as
long as music plays.

Accuracy. Auto-brightness produces real brightness changes — 2301 in one session
on a machine doing nothing — so the HUD ignores steps smaller than 0.005. That
filter cannot tell the ambient light sensor from a very slow hand: drag the
Control Center slider over more than about three seconds and the HUD never
appears.

Lifecycle correctness, which I underestimated. Refusing to poll makes every
subsystem a registration, and every registration has to be undone. `stop()`
became the hard part of each module, and three of them — `VolumeObserver`,
`BrightnessObserver`, `MediaKeyMonitor` — shipped a `stop()` that forgot
something `start()` had registered. The boolean flipped, the module looked
stopped, the listener leaked. Reading the code caught none of them; exposing a
registration count and asserting it did, and that is now how every observer here
is built.

Avoiding a poll can also cost more than polling. Since macOS 15.4, Now Playing
metadata is gated by code-signing identifier, which an ad-hoc-signed app cannot
satisfy — so the app runs a helper through the system's own `perl`, signed as
`com.apple.perl`, and reads newline-delimited JSON back. A supervised subprocess
is heavier than a timer. It starts only while the machine is awake and unlocked,
and it dies with the app.

## The result

v0.6.0, every planned module shipped. Each can be switched off, and switching it
off stops what it runs rather than hiding it — the clipboard's poller, the media
helper's subprocess, the HUD's event tap, the shortcut's registration. That
lives in one `ModuleSwitchboard`, because the three lists it replaced in the app
delegate did not agree with each other. The same rule produced the target split:
`CreativeNotchCore` never imports AppKit or SwiftUI, which is what lets the
geometry, state machine and peek arbitration run headlessly in CI in about a
second.
