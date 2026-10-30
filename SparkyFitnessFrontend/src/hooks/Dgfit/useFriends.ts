import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptFriendRequest,
  copyFriendProgram,
  getFeed,
  getFriendExerciseHistory,
  getFriendProfile,
  getFriends,
  getLeaderboard,
  getLeaderboardExercises,
  getPrivacy,
  removeFriendship,
  searchUsers,
  sendFriendRequest,
  updatePrivacy,
  type LeaderboardMetric,
} from '@/api/Dgfit/friendsApi';
export type {
  FeedItem,
  LeaderboardMetric,
  PublicUser,
} from '@/api/Dgfit/friendsApi';
import { workoutPlanKeys } from '@/hooks/Exercises/useWorkoutPlans';
import { getErrorMessage } from '@/utils/api';

export const friendKeys = {
  all: ['dgfit', 'friends'] as const,
  list: () => [...friendKeys.all, 'list'] as const,
  search: (q: string) => [...friendKeys.all, 'search', q] as const,
  feed: () => [...friendKeys.all, 'feed'] as const,
  privacy: () => [...friendKeys.all, 'privacy'] as const,
  profile: (id: string) => [...friendKeys.all, 'profile', id] as const,
  history: (id: string, exerciseId: string) =>
    [...friendKeys.all, 'history', id, exerciseId] as const,
  leaderboardExercises: () =>
    [...friendKeys.all, 'leaderboard-exercises'] as const,
  leaderboard: (metric: string, exerciseId?: string) =>
    [...friendKeys.all, 'leaderboard', metric, exerciseId ?? ''] as const,
};

export const useFriends = () =>
  useQuery({ queryKey: friendKeys.list(), queryFn: getFriends });

export const useUserSearch = (q: string) =>
  useQuery({
    queryKey: friendKeys.search(q),
    queryFn: () => searchUsers(q),
    enabled: q.trim().length >= 2,
  });

export const useFeed = () =>
  useQuery({ queryKey: friendKeys.feed(), queryFn: getFeed });

export const useFriendProfile = (userId: string) =>
  useQuery({
    queryKey: friendKeys.profile(userId),
    queryFn: () => getFriendProfile(userId),
    enabled: !!userId,
  });

export const useFriendExerciseHistory = (
  userId: string,
  exerciseId: string | null
) =>
  useQuery({
    queryKey: friendKeys.history(userId, exerciseId ?? ''),
    queryFn: () => getFriendExerciseHistory(userId, exerciseId!),
    enabled: !!userId && !!exerciseId,
  });

export const useLeaderboardExercises = () =>
  useQuery({
    queryKey: friendKeys.leaderboardExercises(),
    queryFn: getLeaderboardExercises,
  });

export const useLeaderboard = (
  metric: LeaderboardMetric,
  exerciseId?: string
) =>
  useQuery({
    queryKey: friendKeys.leaderboard(metric, exerciseId),
    queryFn: () => getLeaderboard(metric, exerciseId),
    enabled: metric !== 'exercise' || !!exerciseId,
  });

export const usePrivacy = () =>
  useQuery({ queryKey: friendKeys.privacy(), queryFn: getPrivacy });

const useFriendMutation = <TArgs, TResult>(
  fn: (args: TArgs) => Promise<TResult>,
  successMessage?: string
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: friendKeys.all }),
    meta: {
      successMessage,
      errorMessage: (error: unknown) => getErrorMessage(error),
    },
  });
};

export const useSendFriendRequest = () =>
  useFriendMutation(sendFriendRequest, 'Arkadaşlık isteği gönderildi.');
export const useAcceptFriendRequest = () =>
  useFriendMutation(acceptFriendRequest, 'Artık arkadaşsınız!');
export const useRemoveFriendship = () => useFriendMutation(removeFriendship);
export const useUpdatePrivacy = () =>
  useFriendMutation(updatePrivacy, 'Gizlilik ayarları kaydedildi.');

export const useCopyFriendProgram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, planId }: { userId: string; planId: number }) =>
      copyFriendProgram(userId, planId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: workoutPlanKeys.all }),
    meta: {
      successMessage:
        'Program kopyalandı. Antrenman sayfasından aktif hale getirebilirsin.',
      errorMessage: (error: unknown) => getErrorMessage(error),
    },
  });
};
