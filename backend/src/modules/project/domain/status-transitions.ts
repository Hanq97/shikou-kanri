import { ProjectStatusName } from './types';

export const VALID_TRANSITIONS: Record<ProjectStatusName, ProjectStatusName[]> =
  {
    quoting: ['received', 'cancelled'],
    received: ['construction', 'cancelled'],
    construction: ['completed', 'cancelled'],
    completed: ['handed_over', 'cancelled'],
    handed_over: [],
    cancelled: [],
  };

export function isValidForwardTransition(
  from: ProjectStatusName,
  to: ProjectStatusName,
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
