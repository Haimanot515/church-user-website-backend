CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isProtected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User" ADD COLUMN "roleId" TEXT;

CREATE INDEX "User_roleId_idx" ON "User"("roleId");

ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Role" ("id", "name", "description", "isProtected") VALUES
    (gen_random_uuid()::text, 'super_admin', 'Full access. Cannot be edited or deleted.', true),
    (gen_random_uuid()::text, 'admin', 'Runs the site day to day, without role management.', true),
    (gen_random_uuid()::text, 'editor', 'Edits website content only.', false),
    (gen_random_uuid()::text, 'user', 'Signed-in member with no admin access.', true);

UPDATE "User"
SET "roleId" = (
    SELECT "id" FROM "Role"
    WHERE "name" = CASE WHEN "User"."isAdmin" THEN 'super_admin' ELSE 'user' END
);
