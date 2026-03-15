import { create } from 'zustand';
import {
  Goal,
  CreateGoalDto,
  UpdateGoalDto,
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  addContribution,
  deleteContribution,
  updateGoalStatus,
} from '../../database/repositories/goalRepository';

interface GoalsState {
  goals: Goal[];
  isLoading: boolean;
  load: () => Promise<void>;
  add: (dto: CreateGoalDto) => Promise<void>;
  edit: (id: number, dto: UpdateGoalDto) => Promise<void>;
  remove: (id: number) => Promise<void>;
  contribute: (goalId: number, amount: number, date: string, note?: string) => Promise<void>;
  removeContribution: (contributionId: number, goalId: number, amount: number) => Promise<void>;
  setStatus: (id: number, status: 'active' | 'completed' | 'paused') => Promise<void>;
}

export const useGoalsStore = create<GoalsState>()((set, get) => ({
  goals: [],
  isLoading: false,

  load: async () => {
    set({ isLoading: true });
    try {
      const goals = await getGoals();
      set({ goals, isLoading: false });
    } catch (e) {
      console.error('load goals error:', e);
      set({ isLoading: false });
    }
  },

  add: async (dto) => {
    await createGoal(dto);
    await get().load();
  },

  edit: async (id, dto) => {
    await updateGoal(id, dto);
    await get().load();
  },

  remove: async (id) => {
    await deleteGoal(id);
    set(state => ({ goals: state.goals.filter(g => g.id !== id) }));
  },

  contribute: async (goalId, amount, date, note) => {
    await addContribution(goalId, amount, date, note);
    await get().load();
  },

  removeContribution: async (contributionId, goalId, amount) => {
    await deleteContribution(contributionId, goalId, amount);
    await get().load();
  },

  setStatus: async (id, status) => {
    await updateGoalStatus(id, status);
    set(state => ({
      goals: state.goals.map(g => g.id === id ? { ...g, status } : g),
    }));
  },
}));
