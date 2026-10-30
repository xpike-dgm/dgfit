import type { buildPresetSessionCreateRequestFromDraft } from '@/utils/workoutPlayback';

// DG FIT: a workout finished without internet is kept here and saved by
// OfflineWorkoutSync once the phone is back online.

type PendingWorkout = ReturnType<
  typeof buildPresetSessionCreateRequestFromDraft
>;

const KEY = 'dgfit-pending-workouts';

export const readPendingWorkouts = (): PendingWorkout[] => {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as PendingWorkout[]) : [];
  } catch {
    return [];
  }
};

const write = (items: PendingWorkout[]) => {
  try {
    if (items.length) localStorage.setItem(KEY, JSON.stringify(items));
    else localStorage.removeItem(KEY);
    window.dispatchEvent(new Event('dgfit-pending-workouts'));
  } catch {
    // Storage unavailable: nothing more we can do offline.
  }
};

export const queueWorkout = (payload: PendingWorkout) =>
  write([...readPendingWorkouts(), payload]);

/** Sends queued workouts in order; stops at the first failure. */
export async function flushPendingWorkouts(
  send: (payload: PendingWorkout) => Promise<unknown>
): Promise<number> {
  let sent = 0;
  let pending = readPendingWorkouts();
  while (pending.length > 0) {
    await send(pending[0]!);
    sent++;
    pending = readPendingWorkouts().slice(1);
    write(pending);
  }
  return sent;
}

/** True when the error looks like "no connection" rather than a server reply. */
export const isOfflineError = (error: unknown) =>
  (typeof navigator !== 'undefined' && navigator.onLine === false) ||
  error instanceof TypeError;
