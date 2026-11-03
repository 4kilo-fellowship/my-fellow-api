export const ROLES = [
  "super_admin",
  "leader",
  "team_leader",
  "coordinator",
  "member",
] as const;

export type Role = (typeof ROLES)[number];
export type LegacyRole = Role | "admin" | "user";

export const PERMISSIONS = [
  "members.view",
  "members.edit",
  "members.contact.view",
  "teams.view",
  "teams.manage",
  "team.members.manage",
  "team.coordinators.assign",
  "events.view",
  "events.manage",
  "attendance.view",
  "attendance.record",
  "announcements.publish",
  "sermons.media.manage",
  "prayer_requests.submit",
  "prayer_requests.manage",
  "finance.give",
  "finance.view",
  "pastoral_notes.view",
  "pastoral_notes.edit",
  "minors_data.view",
  "reports.view",
  "reports.export",
  "roles.assign",
  "roles.assign_super_admin",
  "settings.manage",
  "audit_logs.view",
  "audit_logs.export",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL_PERMISSIONS = new Set<Permission>(PERMISSIONS);

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  super_admin: ALL_PERMISSIONS,
  leader: new Set([
    "members.view",
    "members.edit",
    "teams.view",
    "teams.manage",
    "team.members.manage",
    "team.coordinators.assign",
    "events.view",
    "events.manage",
    "attendance.view",
    "attendance.record",
    "announcements.publish",
    "sermons.media.manage",
    "prayer_requests.submit",
    "prayer_requests.manage",
    "finance.give",
    "reports.view",
    "roles.assign",
  ]),
  team_leader: new Set([
    "members.view",
    "members.edit",
    "teams.view",
    "teams.manage",
    "team.members.manage",
    "team.coordinators.assign",
    "events.view",
    "events.manage",
    "attendance.view",
    "attendance.record",
    "announcements.publish",
    "prayer_requests.submit",
    "prayer_requests.manage",
    "finance.give",
    "reports.view",
    "roles.assign",
  ]),
  coordinator: new Set([
    "members.view",
    "teams.view",
    "events.view",
    "attendance.view",
    "attendance.record",
    "announcements.publish",
    "prayer_requests.submit",
    "finance.give",
  ]),
  member: new Set([
    "members.view",
    "teams.view",
    "events.view",
    "prayer_requests.submit",
    "finance.give",
  ]),
};

export function normalizeRole(role?: string | null): Role {
  switch (role) {
    case "admin":
    case "super_admin":
      return "super_admin";
    case "leader":
      return "leader";
    case "team_leader":
      return "team_leader";
    case "coordinator":
      return "coordinator";
    default:
      return "member";
  }
}

export function permissionsForRole(role?: string | null): ReadonlySet<Permission> {
  return ROLE_PERMISSIONS[normalizeRole(role)];
}

export function roleHasPermission(
  role: string | null | undefined,
  permission: Permission,
  explicitGrants: readonly string[] = [],
): boolean {
  return (
    permissionsForRole(role).has(permission) ||
    explicitGrants.includes(permission)
  );
}

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}
