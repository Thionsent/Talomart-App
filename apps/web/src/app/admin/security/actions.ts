"use server";

import { sql } from "@talomart/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  requireAdminPermission,
  staffPermissionValues
} from "@/lib/admin-authorization";
import { recordAdminAudit } from "@/lib/admin-audit";

const updatePermissionsSchema = z.object({
  userId: z.string().min(1),
  permissions: z.array(z.enum(staffPermissionValues))
});

export async function updateStaffPermissions(formData: FormData) {
  const actor = await requireAdminPermission("staff.manage", {
    mutation: true
  });
  const parsed = updatePermissionsSchema.safeParse({
    userId: String(formData.get("userId") ?? ""),
    permissions: formData.getAll("permissions").map(String)
  });

  if (!parsed.success) {
    redirect("/admin/security?error=Invalid%20permission%20selection.");
  }

  try {
    await sql.begin(async (transaction) => {
      const [staff] = await transaction<
        { id: string; email: string; role: string }[]
      >`
        select id, email, role
        from "user"
        where id = ${parsed.data.userId}
        for update
      `;
      if (!staff || staff.role !== "staff") {
        throw new Error("Permissions can only be assigned to staff accounts.");
      }

      const existing = await transaction<{ permission: string }[]>`
        select permission::text
        from staff_permissions
        where user_id = ${staff.id}
      `;
      await transaction`
        delete from staff_permissions
        where user_id = ${staff.id}
      `;

      for (const permission of parsed.data.permissions) {
        await transaction`
          insert into staff_permissions (user_id, permission, granted_by)
          values (${staff.id}, ${permission}, ${actor.id})
        `;
      }

      await recordAdminAudit(transaction as unknown as typeof sql, actor, {
        action: "staff.permissions_update",
        resourceType: "staff_account",
        resourceId: staff.id,
        summary: `Updated permissions for ${staff.email}`,
        before: { permissions: existing.map((row) => row.permission).sort() },
        after: { permissions: [...parsed.data.permissions].sort() }
      });
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Permissions could not be updated.";
    redirect(`/admin/security?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/security");
  redirect("/admin/security?notice=Staff%20permissions%20updated.");
}
