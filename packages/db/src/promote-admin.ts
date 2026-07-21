import { eq } from "drizzle-orm";

import { db, users } from "./index";

function argValue(name: string) {
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);

  const index = process.argv.indexOf(name);
  if (index >= 0) return process.argv[index + 1];

  return undefined;
}

const email = argValue("--email") ?? process.env.ADMIN_EMAIL;
const role = argValue("--role") ?? process.env.ADMIN_ROLE ?? "admin";

if (!email) {
  console.error(
    "Missing admin email. Usage: npm run user:promote-admin -- --email owner@example.com"
  );
  process.exit(1);
}

if (role !== "admin" && role !== "staff") {
  console.error("Role must be either admin or staff.");
  process.exit(1);
}

const [updatedUser] = await db
  .update(users)
  .set({
    role,
    updatedAt: new Date()
  })
  .where(eq(users.email, email.toLowerCase()))
  .returning({
    id: users.id,
    email: users.email,
    role: users.role
  });

if (!updatedUser) {
  console.error(
    `No Talomart user found for ${email}. Create the account first, then run this command again.`
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      promoted: true,
      email: updatedUser.email,
      role: updatedUser.role
    },
    null,
    2
  )
);
