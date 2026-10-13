const ROLE_NAMES = Object.freeze({
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  EDITOR: "editor",
  USER: "user",
});

const { SUPER_ADMIN, ADMIN, EDITOR } = ROLE_NAMES;

const content = (name, description) => ({
  name,
  description,
  sensitive: false,
  roles: [ADMIN, EDITOR],
});
const staff = (name, description, sensitive = false) => ({
  name,
  description,
  sensitive,
  roles: [ADMIN],
});
const owner = (name, description) => ({ name, description, sensitive: true, roles: [] });

const CATALOG = Object.freeze([
  content("POST_MANAGE", "Create, edit and delete posts, and see drafts"),
  content("MEDIA_MANAGE", "Create, edit and delete media, and see drafts"),
  content("CATEGORY_MANAGE", "Manage categories"),
  content("LANGUAGE_MANAGE", "Manage languages"),
  content("CHURCH_MANAGE", "Manage churches"),
  content("CHURCH_ASSIGNMENT_MANAGE", "Manage church assignments"),
  content("CHURCH_STORY_MANAGE", "Manage the church story"),
  content("CHURCH_PERSON_MANAGE", "Manage church people"),
  content("ABOUT_MANAGE", "Manage the about page"),
  content("PROMOTION_MANAGE", "Manage promotions"),
  content("MISSION_VISION_MANAGE", "Manage mission and vision"),
  content("LANDING_HERO_MANAGE", "Manage the landing hero"),
  content("HOME_HERO_MANAGE", "Manage the home hero"),
  content("SERVICE_MANAGE", "Manage services"),
  content("FAQ_MANAGE", "Manage FAQs"),
  content("MISBAK_MANAGE", "Manage the daily misbak"),
  staff("BANK_ACCOUNT_MANAGE", "Manage donation bank accounts", true),
  staff("SUBSCRIBER_READ", "View the subscriber list", true),
  staff("MESSAGE_READ", "Read visitor message threads"),
  staff("MESSAGE_REPLY", "Reply to visitor messages"),
  staff("USER_READ", "List users"),
  staff("USER_UPDATE", "Rename users and change verification"),
  staff("USER_DELETE", "Delete users", true),
  staff("USER_ROLE_ASSIGN", "Change a user's role", true),
  staff("USER_FORCE_LOGOUT", "End every session of a user", true),
  staff("ROLE_READ", "View roles and their permissions"),
  staff("PERMISSION_READ", "View the permission list"),
  owner("ROLE_MANAGE", "Create, edit and delete roles and change their permissions"),
  owner("AUDIT_LOG_READ", "Read the audit log"),
]);

const P = Object.freeze(Object.fromEntries(CATALOG.map((p) => [p.name, p.name])));
const ALL_PERMISSIONS = Object.freeze(CATALOG.map((p) => p.name));
const SENSITIVE_PERMISSIONS = Object.freeze(CATALOG.filter((p) => p.sensitive).map((p) => p.name));

const DEFAULT_ROLES = Object.freeze([
  {
    name: SUPER_ADMIN,
    description: "Full access. Cannot be edited or deleted.",
    isProtected: true,
  },
  {
    name: ADMIN,
    description: "Runs the site day to day, without role management.",
    isProtected: true,
  },
  { name: EDITOR, description: "Edits website content only.", isProtected: false },
  {
    name: ROLE_NAMES.USER,
    description: "Signed-in member with no admin access.",
    isProtected: true,
  },
]);

const PERMISSION_LOCKED_ROLES = Object.freeze([SUPER_ADMIN, ROLE_NAMES.USER]);

const defaultPermissionsFor = (roleName) =>
  roleName === SUPER_ADMIN
    ? [...ALL_PERMISSIONS]
    : CATALOG.filter((p) => p.roles.includes(roleName)).map((p) => p.name);

module.exports = {
  ROLE_NAMES,
  CATALOG,
  P,
  ALL_PERMISSIONS,
  SENSITIVE_PERMISSIONS,
  DEFAULT_ROLES,
  PERMISSION_LOCKED_ROLES,
  defaultPermissionsFor,
};
