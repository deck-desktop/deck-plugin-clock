// Clock — the time in the footer.
//
// A plugin with no tab at all: it exports `Status` and `Settings` and no default component, so
// it contributes a footer readout and a panel to configure it, and nothing to the sidebar. That
// is the point of it being in this repo — it is the worked example of the smallest useful
// plugin, next to the sorter (a tab) and music (a tab, a Provider and a Bar).
//
// It is also the reason the second timezone exists: a clock showing the time somewhere else is
// worth a permanent line when half the people you work with are not in your zone, and Windows
// will only show one in the tray.
import { useEffect, useState, useSyncExternalStore } from "react";
import { Clock as ClockIcon } from "lucide-react";
import { Field, TextInput, Row } from "../shim/ui.js";
import {
  DEFAULTS, format, get, getVersion, load, subscribe, update, zoneIsValid,
} from "./settings";

// Read once at import, so the readout has its settings before its first render rather than
// flashing the defaults for a tick.
void load();

/** The footer readout. */
export function Status() {
  useSyncExternalStore(subscribe, getVersion);
  const s = get();
  const [now, setNow] = useState(() => new Date());

  // A one-second tick only when seconds are shown; otherwise every fifteen, which is frequent
  // enough that the minute is never visibly wrong and idle enough not to wake the renderer
  // sixty times a minute for a display that changes once.
  useEffect(() => {
    const period = s.seconds ? 1000 : 15_000;
    const t = setInterval(() => setNow(new Date()), period);
    return () => clearInterval(t);
  }, [s.seconds]);

  const { time, date } = format(now, s);
  const parts = [s.label, date, time].filter(Boolean);

  return (
    <button
      // Clicking copies it: the reason to look at a clock in another zone is usually to put the
      // time into a message, and this saves retyping it.
      onClick={() => { void navigator.clipboard.writeText(time).catch(() => {}); }}
      title={`${s.zone || "Local time"} — click to copy`}
      className="flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-1 transition-colors hover:bg-white/10"
      style={{ color: "var(--text-secondary)" }}
    >
      <ClockIcon size={10} />
      {parts.join(" ")}
    </button>
  );
}

/** Command-palette entries. */
export function commands() {
  const s = get();
  return [
    {
      id: "copy",
      title: "Clock: copy the time",
      run: () => { void navigator.clipboard.writeText(format(new Date(), s).time).catch(() => {}); },
    },
  ];
}

/**
 * The settings panel, rendered inside this plugin's own row in Settings > Plugins.
 *
 * Uses Deck's own Field/Row/TextInput so it looks like the rest of that screen rather than like
 * a plugin's approximation of it.
 */
export function Settings() {
  useSyncExternalStore(subscribe, getVersion);
  const s = get();
  // Not held in state: the stored value IS the state, and a local copy would have to be kept in
  // step with it. The only reason to look at the raw text is to tell "still typing" from "wrong".
  const zoneOk = zoneIsValid(s.zone);

  return (
    <div className="space-y-3">
      <Field
        label="Timezone"
        hint={
          s.zone
            ? (zoneOk ? "" : "Not a timezone this machine knows — showing local time until it is.")
            : "Empty means this machine's own time. Try Europe/Istanbul, America/New_York, UTC."
        }
      >
        <TextInput
          value={s.zone}
          onChange={(e) => void update({ zone: e.target.value.trim() })}
          placeholder="Local"
          // Red while it does not resolve, so a typo is visible here rather than as a clock
          // that quietly shows the wrong time.
          style={!zoneOk ? { borderColor: "var(--danger)" } : undefined}
        />
      </Field>

      <Field label="Label" hint="Shown before the time. Worth setting when the zone is not yours.">
        <TextInput
          value={s.label}
          onChange={(e) => void update({ label: e.target.value })}
          placeholder="None"
        />
      </Field>

      <Row title="12-hour clock" desc="Off shows 24-hour time."
        on={s.hour12} onChange={(v) => void update({ hour12: v })} />
      <Row title="Show seconds" desc="Also ticks once a second rather than every fifteen."
        on={s.seconds} onChange={(v) => void update({ seconds: v })} />
      <Row title="Show the date" desc="The weekday and day of month, beside the time."
        on={s.showDate} onChange={(v) => void update({ showDate: v })} />

      <button
        onClick={() => void update(DEFAULTS)}
        className="rounded-md border border-subtle bg-elev px-3 py-1.5 text-[12px] text-text-secondary transition hover:text-text-primary"
      >
        Reset to defaults
      </button>
    </div>
  );
}
