export const TEAM_SCHEDULE_KEY = 'gridiron-scout.team-schedule.v1';
export const DEFAULT_TEAM = { id: 'team-default', name: 'My Team', week: '' };

export function getTeamDatasetKey(teamId) {
  return `gridiron-scout.team.${encodeURIComponent(teamId)}.dataset.v1`;
}

export function isStoredTeamSchedule(value) {
  if (!Array.isArray(value?.teams) || value.teams.length === 0) return false;
  const ids = new Set();
  const validTeams = value.teams.every((team) => {
    if (
      !team ||
      typeof team.id !== 'string' ||
      !team.id ||
      typeof team.name !== 'string' ||
      !team.name.trim() ||
      (team.week !== undefined && typeof team.week !== 'string') ||
      ids.has(team.id)
    ) {
      return false;
    }
    ids.add(team.id);
    return true;
  });
  return validTeams && ids.has(value.selectedTeamId);
}

export function createTeamScheduleEntry(name, week = '') {
  const suffix = Math.random().toString(36).slice(2, 8);
  return {
    id: `team-${Date.now().toString(36)}-${suffix}`,
    name: name.trim(),
    week: week.trim(),
  };
}
