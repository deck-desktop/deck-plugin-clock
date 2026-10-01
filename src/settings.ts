// The clock's settings, and the store that holds them.
//
// At module scope rather than in a component, for the reason Deck's own CLAUDE.md gives: the
// readout and the settings panel are two separate components that must agree, and they are never
// mounted at the same time — the panel lives in Settings, the readout in the footer. A shared
// store is what keeps them in step without either owning the other.
import { configRead, configWrite } from "../shim/bridge.js";

const CFG = "plugin-clock";

export interface ClockSettings {
  /** An IANA zone ("Europe/Istanbul"), or "" for this machine's own. */
  zone: string;
  /** A label shown before the time. Useful when the zone is not the local one. */
  label: string;
  seconds: boolean;
  hour12: boolean;
  /** Show the weekday and day of month beside the time. */
  showDate: boolean;
}

export const DEFAULTS: ClockSettings = {
  zone: "",
  label: "",
  seconds: false,
  hour12: true,
  showDate: false,
};

let settings: ClockSettings = { ...DEFAULTS };
let loaded = false;

let version = 0;
const listeners = new Set<() => void>();
const emit = () => { version++; listeners.forEach((f) => f()); };

export const subscribe = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
export const getVersion = () => version;
export const get = () => settings;

/** Read the stored settings once. Safe to call from every component that needs them. */
export async function load(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const t = await configRead(CFG);
    if (t.trim()) {
      // Field by field rather than a blind spread: a hand-edited file, or one written by an
      // older version, should not be able to put a number where a boolean belongs.
      const raw = JSON.parse(t) as Partial<ClockSettings>;
      settings = {
        zone: typeof raw.zone === "string" ? raw.zone : DEFAULTS.zone,
        label: typeof raw.label === "string" ? raw.label : DEFAULTS.label,
        seconds: typeof raw.seconds === "boolean" ? raw.seconds : DEFAULTS.seconds,
        hour12: typeof raw.hour12 === "boolean" ? raw.hour12 : DEFAULTS.hour12,
        showDate: typeof raw.showDate === "boolean" ? raw.showDate : DEFAULTS.showDate,
      };
    }
  } catch { /* a corrupt file is not worth failing the readout for */ }
  emit();
}

export async function update(patch: Partial<ClockSettings>): Promise<void> {
  settings = { ...settings, ...patch };
  emit();
  await configWrite(CFG, JSON.stringify(settings, null, 2)).catch(() => {});
}

/**
 * Is this a timezone the runtime actually knows?
 *
 * Checked by trying it: Intl throws a RangeError on an unknown zone, and the alternative is
 * shipping a list of several hundred names that goes stale. A typo in the box therefore falls
 * back to local time rather than throwing inside the footer, where an exception would take the
 * readout down with it.
 */
export function zoneIsValid(zone: string): boolean {
  if (!zone) return true; // "" means local, which is always valid
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: zone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/** The formatted time, and the date when it is asked for. */
export function format(now: Date, s: ClockSettings): { time: string; date: string } {
  const zone = zoneIsValid(s.zone) ? s.zone : "";
  const opts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: s.hour12,
    ...(s.seconds ? { second: "2-digit" } : {}),
    ...(zone ? { timeZone: zone } : {}),
  };
  const time = new Intl.DateTimeFormat("en-GB", opts).format(now);
  const date = s.showDate
    ? new Intl.DateTimeFormat("en-GB", {
        weekday: "short", day: "numeric", month: "short",
        ...(zone ? { timeZone: zone } : {}),
      }).format(now)
    : "";
  return { time, date };
}
