export type EcsEnforcementMode = 'force' | 'penalize' | 'off';

export type EcsServiceConfig = {
  enforcementMode: EcsEnforcementMode;
  deadlineHour: number;
  target_C: number;
  penalty_EUR_per_K?: number;
};

export const defaultEcsServiceConfig = (): EcsServiceConfig => ({
  enforcementMode: 'force',
  deadlineHour: 21,
  target_C: 55,
  penalty_EUR_per_K: 0.08
});
