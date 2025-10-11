import type { HeatingParams } from '../devices/Heating';
import type { PoolPumpParams } from '../devices/PoolPump';

export interface HeatingFormState {
  enabled: boolean;
  params: HeatingParams;
}

export const cloneHeatingFormState = (config: HeatingFormState): HeatingFormState => ({
  enabled: config.enabled,
  params: { ...config.params }
});

export interface PoolFormState {
  enabled: boolean;
  params: PoolPumpParams;
}

export const clonePoolFormState = (config: PoolFormState): PoolFormState => ({
  enabled: config.enabled,
  params: {
    ...config.params,
    preferredWindows: config.params.preferredWindows.map((window) => ({ ...window }))
  }
});
