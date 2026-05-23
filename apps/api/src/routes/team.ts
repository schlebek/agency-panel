import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, users, invitations, tenants } from "@agency/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { hashPassword } from "../lib/auth";
import { Resend } from "resend";
import { addDays } from "date-fns";
import crypto from "crypto";

const app = new Hono();
const resend = new Resend(process.env.RESEND_API_KEY);

app.use("*", requireAuth);

app.get("/", async (c) => {
  const tenant = c.get("tenant");
  const members = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role, isActive: users.isActive, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.tenantId, tenant.id));

  const pendingInvites = await db
    .select({ id: invitations.id, email: invitations.email, role: invitations.role, createdAt: invitations.createdAt, expiresAt: invitations.expiresAt })
    .from(invitations)
    .where(and(eq(invitations.tenantId, tenant.id), eq(invitations.acceptedAt, null as any)));

  return c.json({ members, pendingInvites });
});

app.post("/invite", zValidator("json", z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]),
})), async (c) => {
  const tenant = c.get("tenant");
  const user = c.get("user");
  if (user.role !== "owner" && user.role !== "admin") return c.json({ error: "Forbidden" }, 403);

  const { email, role } = c.req.valid("json");

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return c.json({ error: "Użytkownik z tym emailem już istnieje" }, 409);

  const token = crypto.randomBytes(32).toString("hex");
  await db.insert(invitations).values({
    tenantId: tenant.id,
    email,
    role,
    token,
    expiresAt: addDays(new Date(), 7),
  });

  const [t] = await db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, tenant.id)).limit(1);
  const inviteUrl = `${process.env.FRONTEND_URL}/join/${token}`;

  if (process.env.RESEND_API_KEY) {
    await resend.emails.send({
      from: "noreply@agencypanel.pl",
      to: email,
      subject: `Zaproszenie do ${t?.name ?? "Agency Panel"}`,
      html: `<p>Zaproszono Cię do panelu agencji <strong>${t?.name}</strong>.</p>
             <p><a href="${inviteUrl}">Kliknij tutaj, aby dołączyć</a></p>
             <p>Link wygaśnie za 7 dni.</p>`,
    });
  }

  return c.json({ success: true, inviteUrl });
});

app.delete("/invite/:id", async (c) => {
  const tenant = c.get("tenant");
  const user = c.get("user");
  if (user.role !== "owner" && user.role !== "admin") return c.json({ error: "Forbidden" }, 403);
  await db.delete(invitations).where(and(eq(invitations.id, c.req.param("id")), eq(invitations.tenantId, tenant.id)));
  return c.json({ success: true });
});

app.patch("/:userId", zValidator("json", z.object({
  role: z.enum(["admin", "member"]).optional(),
  isActive: z.boolean().optional(),
})), async (c) => {
  const tenant = c.get("tenant");
  const user = c.get("user");
  if (user.role !== "owner") return c.json({ error: "Tylko właściciel może zmieniać role" }, 403);

  const targetId = c.req.param("userId");
  if (targetId === user.id) return c.json({ error: "Nie możesz edytować własnego konta" }, 400);

  const body = c.req.valid("json");
  await db.update(users).set({ ...body, updatedAt: new Date() })
    .where(and(eq(users.id, targetId), eq(users.tenantId, tenant.id)));
  return c.json({ success: true });
});

app.delete("/:userId", async (c) => {
  const tenant = c.get("tenant");
  const user = c.get("user");
  if (user.role !== "owner") return c.json({ error: "Tylko właściciel może usuwać członków" }, 403);

  const targetId = c.req.param("userId");
  if (targetId === user.id) return c.json({ error: "Nie możesz usunąć własnego konta" }, 400);

  await db.update(users).set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(users.id, targetId), eq(users.tenantId, tenant.id)));
  return c.json({ success: true });
});

export default app;
