import { create } from 'zustand';
import type { Rule, ApprovalRequest } from '../api/client';

interface RuleStore {
  rules: Rule[];
  approvals: ApprovalRequest[];
  setRules: (rules: Rule[]) => void;
  addApproval: (approval: ApprovalRequest) => void;
  removeApproval: (id: string) => void;
  setApprovals: (approvals: ApprovalRequest[]) => void;
}

export const useRuleStore = create<RuleStore>((set) => ({
  rules: [],
  approvals: [],
  setRules: (rules) => set({ rules }),
  addApproval: (approval) =>
    set((state) => ({
      approvals: [...state.approvals.filter(a => a.id !== approval.id), approval],
    })),
  removeApproval: (id) =>
    set((state) => ({
      approvals: state.approvals.filter((a) => a.id !== id),
    })),
  setApprovals: (approvals) => set({ approvals }),
}));
