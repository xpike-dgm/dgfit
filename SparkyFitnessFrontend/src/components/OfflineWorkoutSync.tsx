import { useCallback, useEffect, useRef, useState } from 'react';
import { CloudOff } from 'lucide-react';
import { useCreatePresetSessionMutation } from '@/hooks/Exercises/useExerciseEntries';
import {
  flushPendingWorkouts,
  readPendingWorkouts,
} from '@/utils/offlineWorkoutQueue';

/** Saves workouts finished offline as soon as the connection is back. */
const OfflineWorkoutSync = () => {
  const { mutateAsync: createPresetSession } = useCreatePresetSessionMutation();
  const [pending, setPending] = useState(() => readPendingWorkouts().length);
  const flushing = useRef(false);

  const flush = useCallback(async () => {
    if (flushing.current || !navigator.onLine) return;
    if (readPendingWorkouts().length === 0) return;
    flushing.current = true;
    try {
      await flushPendingWorkouts((payload) => createPresetSession(payload));
    } catch {
      // Still offline or the server refused; try again on the next event.
    } finally {
      flushing.current = false;
      setPending(readPendingWorkouts().length);
    }
  }, [createPresetSession]);

  useEffect(() => {
    const refresh = () => setPending(readPendingWorkouts().length);
    void flush();
    window.addEventListener('online', flush);
    window.addEventListener('dgfit-pending-workouts', refresh);
    const timer = window.setInterval(flush, 60_000);
    return () => {
      window.removeEventListener('online', flush);
      window.removeEventListener('dgfit-pending-workouts', refresh);
      window.clearInterval(timer);
    };
  }, [flush]);

  if (pending === 0) return null;
  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
      <CloudOff className="h-4 w-4 text-amber-500" />
      {pending} antrenman telefonda bekliyor; internet gelince otomatik
      kaydedilecek.
    </div>
  );
};

export default OfflineWorkoutSync;
