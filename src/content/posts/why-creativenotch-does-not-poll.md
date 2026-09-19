---
title: Why CreativeNotch does not poll
description: One rule written before the first module, the single exception that proves it, and what enforcing it centrally actually bought.
date: 2026-09-19
---

A notch app is ambient software. It sits under the menu bar for as long as the
machine is on, and almost none of that time is spent looking at it. Its idle
cost is therefore the only cost that really matters — a menu-bar utility that
is fast when you open it and busy when you don't is a bad trade, because you
don't open it very often.

The obvious way to build one is continuous. A global event monitor to know
where the cursor is. A repeating timer to refresh system stats. An audio tap
to drive a visualiser. Each is cheap per tick, each is the first result you
find, and none of them ever stops.

So before the first module I wrote down one rule:

> No subsystem runs when it isn't needed, and that rule is enforced centrally
> rather than trusted to each module.

The second clause is the one doing the work. "Don't waste cycles" is a thing
everybody already agrees with and nobody can be held to. Enforcement in one
place is a thing you can actually check.

## The ban list is a search instruction

`ARCHITECTURE.md` names four constructs as not allowed: an unconditional
`Timer`, a permanently-installed global event monitor, cursor-position
polling, and an audio tap. Alongside them is the sentence that makes the list
useful rather than merely restrictive:

> If you believe you need one, you almost certainly need a notification you
> have not found yet.

That reframes the ban as a hint about where to look. Nearly every time I
reached for a banned construct, the platform already had an event for what I
wanted and I hadn't found it. `NSTrackingArea` costs nothing when the cursor
is elsewhere. `NSWorkspace` and `NotificationCenter` publish most state
changes worth reacting to. An `NSMenuDelegate` can refresh on menu open
instead of refreshing forever against the possibility that a menu opens.

A one-shot scheduled to a known future instant is allowed, with the countdown
timer as the precedent. The rule is not "never schedule work" — it's that
nothing runs when it isn't needed, and a countdown the user deliberately
started is needed by definition. What it must not do is schedule anything
while no countdown is running.

## The exception, and why it is the interesting part

One subsystem genuinely polls. `NSPasteboard` has no change notification;
the only way to know something was copied is to read `changeCount` and
compare it to the last one you saw. There is no event to find. I looked.

Clipboard history therefore gets a poller, and the poller is designed around
minimising what that costs: 0.75s while you're actively working, backing off
to 3s after two quiet minutes, floored at 2s under Low Power Mode, and fully
suspended while the screen is locked or the machine is asleep.

Resuming resyncs the change count *without* capturing whatever was copied in
the meantime. That's not an optimisation — it's there so that unlocking your
Mac doesn't swallow a password you copied on another device. Concealed,
transient and auto-generated pasteboard types are checked before any content
is read, which is what password managers set, so the app never holds a
secret even briefly.

The important part isn't that the poller is careful. It's that the exception
is what forced the gate to exist, and the gate is what made the rule
enforceable everywhere else.

## Four consumers, three ways to join

`SystemActivity` is the central gate. Four subsystems join it, and they join
it in three different ways.

The clipboard poller and the media helper are **suspended** outside the
active state. That's the obvious behaviour, and if it were the only one the
gate would just be an on/off switch.

The power module is **never suspended**. It's driven by
`IOPSNotificationCreateRunLoopSource` and
`NSProcessInfo.processInfoPowerStateDidChange` — both notifications, so a
registered run-loop source that never fires costs nothing idle. Suspending it
would mean missing the charger being plugged in while the lid was shut, and
then being wrong on wake. What the power module suppresses instead is the
*peek* — the visible interruption — while leaving the observer running.
Transitions behind a lock screen are dropped rather than replayed, because a
peek is timed to a moment, and telling you "unplugged" ten minutes late is a
notification, which this app is not.

The timer splits itself: its **redraws are gated, its deadline never is.**

So the conclusion worth taking away is that joining the gate does not have to
mean being switched off. A gate that only knows how to stop things will be
routed around by the first subsystem that can't afford to stop, and then you
have two power models instead of one.

## What the rule bought

The battery module was the first one that needed **no exception at all**. No
timer, no poller, no permission prompt — both sources are notifications, and
every judgement on top of them is a pure, time-injected type.

It shipped with a time-remaining estimate, and I removed it. Not for
simplicity: IOKit's estimate is genuinely unreliable. It swings 55% over an
hour, reports "not applicable" as `0` on one key and `-1` on another, and
quantises into 5- and 10-minute steps that make a relative tolerance useless
at the low end. I built the settling window and the agreement rule over
consecutive readings, and every part was necessary, which was the tell.

What replaced it is the state line — charging, not charging, fully charged,
on battery — which IOKit states outright and cannot be wrong about.

The second-order effect is the one I didn't predict. The estimate was the
field that changed on nearly every IOKit notification: 43 callbacks in 39
minutes on an idle machine. With it gone, the observer drops almost all of
those as carrying nothing new, and wakes its consumers only when something a
person could actually notice has changed.

Removing the feature made the module cheaper *and* more honest. That's the
argument for writing the rule down before the first module rather than
optimising afterwards: by the time the estimate was a performance problem, it
would have been a shipped feature with users, and I'd have been tuning it
instead of deleting it.
