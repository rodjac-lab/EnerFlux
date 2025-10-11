import type { HeatingParams } from '../devices/Heating';

export interface HeatingFormState {
  enabled: boolean;
  params: HeatingParams;
}

export const cloneHeatingFormState = (config: HeatingFormState): HeatingFormState => ({
  enabled: config.enabled,
  params: { ...config.params }
});
