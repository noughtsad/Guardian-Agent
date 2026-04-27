import { useEffect } from 'react';
import { useRuleStore } from '../store/ruleStore';
import { api } from '../api/client';

export function useRules() {
  const { rules, setRules } = useRuleStore();

  useEffect(() => {
    api.getRules().then(setRules).catch(console.error);
  }, [setRules]);

  return rules;
}
