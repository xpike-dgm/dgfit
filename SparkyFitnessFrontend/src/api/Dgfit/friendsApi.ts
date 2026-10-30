import { apiCall } from '@/api/api';

export interface PublicUser {
  id: string;
  username: string | null;
  name: string;
  avatar_url: string | null;
}

export interface FriendEntry extends PublicUser {
  friendship_id: string;
  since: string;
}

export interface FriendsList {
  friends: FriendEntry[];
  incoming: FriendEntry[];
  outgoing: FriendEntry[];
}

export interface UserSearchResult extends PublicUser {
  friendship_status: 'pending' | 'accepted' | null;
  outgoing: boolean | null;
}

export interface PrivacySettings {
  share_workouts: boolean;
  share_weight: boolean;
  share_nutrition: boolean;
  share_measurements: boolean;
  share_photos: boolean;
  share_programs: boolean;
}

export type FeedItem =
  | {
      type: 'workout';
      user_id: string;
      date: string;
      at: string;
      name: string;
      exercise_count: number;
      set_count: number;
      volume_kg: number;
      has_pr: boolean;
      exercises: string[];
    }
  | {
      type: 'weight';
      user_id: string;
      date: string;
      at: string;
      weight_kg: number;
      change_kg: number | null;
    };

export interface Feed {
  users: PublicUser[];
  items: FeedItem[];
}

export interface FriendProfile {
  user: PublicUser;
  privacy: PrivacySettings;
  weights?: { date: string; weight_kg: number }[];
  measurements?: {
    entry_date: string;
    waist: string | null;
    neck: string | null;
    hips: string | null;
    body_fat_percentage: string | null;
    muscle_mass_kg: string | null;
  } | null;
  nutrition?: {
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }[];
  workouts?: {
    date: string;
    name: string;
    set_count: number;
    volume_kg: number;
    has_pr: boolean;
    exercises: string[];
  }[];
  best_lifts?: {
    exercise_id: string;
    exercise_name: string;
    weight_kg: number;
    reps: number;
    e1rm_kg: number;
    date: string;
  }[];
  programs?: {
    id: number;
    plan_name: string;
    is_active: boolean;
    days: { day_of_week: number; name: string }[];
  }[];
}

export type LeaderboardMetric =
  'exercise' | 'weekly_volume' | 'weekly_workouts';

export interface Leaderboard {
  users: PublicUser[];
  rows: { user_id: string; value: number; detail?: string }[];
}

const base = '/dgfit/friends';

export const getFriends = (): Promise<FriendsList> => apiCall(base);
export const searchUsers = (q: string): Promise<UserSearchResult[]> =>
  apiCall(`${base}/search`, { params: { q } });
export const sendFriendRequest = (
  username: string
): Promise<{ status: 'pending' | 'accepted' }> =>
  apiCall(`${base}/requests`, { method: 'POST', body: { username } });
export const acceptFriendRequest = (friendshipId: string): Promise<void> =>
  apiCall(`${base}/requests/${friendshipId}/accept`, { method: 'POST' });
export const removeFriendship = (friendshipId: string): Promise<void> =>
  apiCall(`${base}/friendships/${friendshipId}`, { method: 'DELETE' });
export const getPrivacy = (): Promise<PrivacySettings> =>
  apiCall(`${base}/privacy`);
export const updatePrivacy = (
  changes: Partial<PrivacySettings>
): Promise<PrivacySettings> =>
  apiCall(`${base}/privacy`, { method: 'PUT', body: changes });
export const getFeed = (): Promise<Feed> => apiCall(`${base}/feed`);
export const getFriendProfile = (userId: string): Promise<FriendProfile> =>
  apiCall(`${base}/users/${userId}`);
export const getFriendExerciseHistory = (
  userId: string,
  exerciseId: string
): Promise<
  { date: string; weight_kg: number; reps: number; e1rm_kg: number }[]
> => apiCall(`${base}/users/${userId}/exercises/${exerciseId}`);
export const getLeaderboardExercises = (): Promise<
  { exercise_id: string; name: string; people: string }[]
> => apiCall(`${base}/leaderboard/exercises`);
export const getLeaderboard = (
  metric: LeaderboardMetric,
  exerciseId?: string
): Promise<Leaderboard> =>
  apiCall(`${base}/leaderboard`, {
    params: exerciseId ? { metric, exerciseId } : { metric },
  });
export const copyFriendProgram = (
  userId: string,
  planId: number
): Promise<{ skipped: number }> =>
  apiCall(`${base}/users/${userId}/programs/${planId}/copy`, {
    method: 'POST',
  });
