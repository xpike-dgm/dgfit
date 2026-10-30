import { workoutPresetCreateRequestSchema } from '@workspace/shared';
import workoutPresetService from '../workoutPresetService.js';
import workoutPlanTemplateService from '../workoutPlanTemplateService.js';
import exerciseRepository from '../../models/exercise.js';
import { FriendError, getFriendProgramForCopy } from './friendService.js';
import { getSystemClient } from '../../db/poolManager.js';
import { log } from '../../config/logging.js';

interface PresetSetRow {
  set_number: number;
  set_type: string | null;
  reps: number | string | null;
  weight: number | string | null;
  duration: number | string | null;
  distance?: number | string | null;
  rest_time: number | string | null;
  notes: string | null;
}

interface PresetExerciseRow {
  exercise_id: string;
  sort_order?: number | null;
  superset_group: number | null;
  progression_mode?: string | null;
  rep_goal?: number | null;
  increment_type?: string | null;
  increment_value?: number | string | null;
  sets: PresetSetRow[];
}

interface AssignmentRow {
  day_of_week: number | null;
  session_name?: string | null;
  sort_order?: number | null;
  workout_preset_id?: number | string | null;
  exercise_id?: string | null;
  sets?: PresetSetRow[] | null;
}

const num = (value: number | string | null | undefined) =>
  value === null || value === undefined || value === '' ? null : Number(value);

const copySets = (sets: PresetSetRow[] | null | undefined) =>
  (sets ?? []).map((set, index) => ({
    set_number: set.set_number ?? index + 1,
    set_type: set.set_type,
    reps: num(set.reps),
    weight: num(set.weight),
    duration: num(set.duration),
    distance: num(set.distance),
    rest_time: num(set.rest_time),
    notes: set.notes,
  }));

// Reads run on the system client after the friendship/privacy check: the
// regular repositories are scoped to the signed-in person by RLS.
async function readPlan(ownerId: string, templateId: number) {
  const client = await getSystemClient();
  try {
    const planResult = await client.query(
      `SELECT id, plan_name, description FROM workout_plan_templates
        WHERE id = $1 AND user_id = $2`,
      [templateId, ownerId]
    );
    const plan = planResult.rows[0] as
      { plan_name: string; description: string | null } | undefined;
    if (!plan) throw new FriendError('Program bulunamadı.', 404);
    const assignments = await client.query(
      `SELECT a.day_of_week, a.session_name, a.sort_order, a.workout_preset_id,
              a.exercise_id,
              COALESCE((SELECT json_agg(s ORDER BY s.set_number)
                          FROM workout_plan_assignment_sets s
                         WHERE s.assignment_id = a.id), '[]') AS sets
         FROM workout_plan_template_assignments a
        WHERE a.template_id = $1
        ORDER BY a.day_of_week, a.sort_order`,
      [templateId]
    );
    return { ...plan, assignments: assignments.rows as AssignmentRow[] };
  } finally {
    client.release();
  }
}

async function readPreset(ownerId: string, presetId: string) {
  const client = await getSystemClient();
  try {
    const presetResult = await client.query(
      `SELECT name, description, workout_format FROM workout_presets
        WHERE id = $1 AND user_id = $2`,
      [presetId, ownerId]
    );
    const preset = presetResult.rows[0] as
      | { name: string; description: string | null; workout_format: string }
      | undefined;
    if (!preset) return null;
    const exercises = await client.query(
      `SELECT e.exercise_id, e.sort_order, e.superset_group, e.progression_mode,
              e.rep_goal, e.increment_type, e.increment_value,
              COALESCE((SELECT json_agg(s ORDER BY s.set_number)
                          FROM workout_preset_exercise_sets s
                         WHERE s.workout_preset_exercise_id = e.id), '[]') AS sets
         FROM workout_preset_exercises e
        WHERE e.workout_preset_id = $1
        ORDER BY e.sort_order, e.id`,
      [presetId]
    );
    return { ...preset, exercises: exercises.rows as PresetExerciseRow[] };
  } finally {
    client.release();
  }
}

async function canSee(viewerId: string, exerciseId: string) {
  return !!(await exerciseRepository.getExerciseById(exerciseId, viewerId));
}

/**
 * Copies a friend's weekly program into the viewer's account: each workout it
 * uses becomes the viewer's own saved workout, and the plan is created
 * inactive so it does not replace the viewer's current program by itself.
 * Exercises the viewer cannot see (a friend's private custom ones) are left out.
 */
export async function copyFriendProgram(
  viewerId: string,
  ownerId: string,
  templateId: number,
  ownerUsername: string | null
) {
  await getFriendProgramForCopy(viewerId, ownerId, templateId);
  const plan = await readPlan(ownerId, templateId);
  const assignments = plan.assignments;
  const presetIdMap = new Map<string, number>();
  let skipped = 0;

  for (const presetId of new Set(
    assignments
      .map((a) => a.workout_preset_id)
      .filter((id): id is number | string => id !== null && id !== undefined)
      .map(String)
  )) {
    const preset = await readPreset(ownerId, presetId);
    if (!preset) continue;
    const exercises = [];
    for (const [index, ex] of preset.exercises.entries()) {
      if (!(await canSee(viewerId, ex.exercise_id))) {
        skipped++;
        continue;
      }
      exercises.push({
        exercise_id: ex.exercise_id,
        sort_order: ex.sort_order ?? index,
        superset_group: ex.superset_group,
        progression_mode: ex.progression_mode ?? null,
        rep_goal: ex.rep_goal ?? null,
        increment_type: ex.increment_type ?? null,
        increment_value: num(ex.increment_value),
        sets: copySets(ex.sets),
      });
    }
    const body = workoutPresetCreateRequestSchema.parse({
      name: preset.name,
      description: preset.description,
      is_public: false,
      workout_format: preset.workout_format ?? 'standard',
      exercises,
    });
    const created = await workoutPresetService.createWorkoutPreset(
      viewerId,
      body
    );
    presetIdMap.set(presetId, created.id);
  }

  const newAssignments = [];
  for (const a of assignments) {
    if (a.workout_preset_id !== null && a.workout_preset_id !== undefined) {
      const mapped = presetIdMap.get(String(a.workout_preset_id));
      if (mapped === null || mapped === undefined) continue;
      newAssignments.push({
        day_of_week: a.day_of_week,
        session_name: a.session_name ?? null,
        sort_order: a.sort_order ?? null,
        workout_preset_id: mapped,
      });
    } else if (a.exercise_id) {
      if (!(await canSee(viewerId, a.exercise_id))) {
        skipped++;
        continue;
      }
      newAssignments.push({
        day_of_week: a.day_of_week,
        session_name: a.session_name ?? null,
        sort_order: a.sort_order ?? null,
        exercise_id: a.exercise_id,
        sets: copySets(a.sets),
      });
    }
  }

  const today: string = new Date().toISOString().slice(0, 10);
  const created = await workoutPlanTemplateService.createWorkoutPlanTemplate(
    viewerId,
    {
      plan_name: ownerUsername
        ? `${plan.plan_name ?? 'Program'} (@${ownerUsername})`
        : (plan.plan_name ?? 'Program'),
      description: plan.description ?? null,
      schedule_type: 'weekly',
      is_active: false,
      start_date: today,
      assignments: newAssignments,
      currentClientDate: today,
    }
  );
  log(
    'info',
    `[DGFIT] Copied program ${templateId} from ${ownerId} to ${viewerId} (${skipped} private exercises skipped)`
  );
  return { plan: created, skipped };
}
