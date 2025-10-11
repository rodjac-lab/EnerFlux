import type { EcsServiceContract } from '../data/ecs-service';
import { cloneEcsServiceContract } from '../data/ecs-service';
import type { StrategyId } from '../core/strategy';

export const resolveEcsServiceForStrategy = (
  base: EcsServiceContract,
  strategyId: StrategyId
): EcsServiceContract => {
  const contract = cloneEcsServiceContract(base);
  switch (strategyId) {
    case 'ecs_first':
      contract.helpers.hysteresisEnabled = false;
      contract.helpers.deadlineEnabled = false;
      break;
    case 'ecs_hysteresis':
      contract.helpers.hysteresisEnabled = true;
      contract.helpers.deadlineEnabled = false;
      break;
    case 'deadline_helper':
      contract.helpers.hysteresisEnabled = true;
      contract.helpers.deadlineEnabled = true;
      break;
    case 'reserve_evening':
      contract.helpers.hysteresisEnabled = true;
      contract.helpers.deadlineEnabled = false;
      break;
    case 'ev_departure_guard':
      contract.helpers.hysteresisEnabled = true;
      contract.helpers.deadlineEnabled = false;
      break;
    case 'multi_equipment_priority':
      contract.helpers.hysteresisEnabled = true;
      contract.helpers.deadlineEnabled = false;
      break;
    default:
      break;
  }
  return contract;
};
