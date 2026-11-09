// Journal portals, and which JMS role unlocks which portal.
export const PORTALS = [
  { key: "admin",  label: "Journal Admin",    prefix: "/admin",           home: "/admin/dashboard",           roles: ["MODULE_ADMIN"] },
  { key: "manager", label: "Journal Manager", prefix: "/managing-editor", home: "/managing-editor/dashboard", roles: ["JOURNAL_MANAGER"] },
  { key: "eic",    label: "Editorial Office", prefix: "/eic",             home: "/eic/dashboard",             roles: ["EIC", "ASSOCIATE_EDITOR", "EDITOR"] },
  { key: "reviewer", label: "Reviewer",       prefix: "/reviewer",        home: "/reviewer/dashboard",        roles: ["REVIEWER"] },
  { key: "author", label: "Author",           prefix: "/author",          home: "/author/dashboard",          roles: ["AUTHOR"] },
];

export function jmsRoles(user) {
  const jms = (user?.modules || []).find((m) => m.code === "JMS");
  return (jms?.roles || []).map((r) => r.code);
}

export const hasJmsRole = (user, ...codes) =>
  !!user && (user.isSuperAdmin || codes.some((c) => jmsRoles(user).includes(c)));

/** Portals the signed-in user may open. */
export function portalsFor(user) {
  if (!user) return [];
  const roles = jmsRoles(user);
  return PORTALS.filter((p) => user.isSuperAdmin || p.roles.some((r) => roles.includes(r)));
}

export function portalOf(pathname) {
  return PORTALS.find((p) => pathname === p.prefix || pathname.startsWith(p.prefix + "/"))?.key;
}

/** Where a signed-in user lands: first portal they have access to. */
export function jmsHome(user) {
  const first = portalsFor(user)[0];
  return first ? first.home : null;
}
