import prisma from "@theseosaas/db";

import { AppError } from "../errors.js";
import { normalizeDomain } from "../util/domain.js";
import type { GoogleProfile } from "./google.js";
import { createSession, type CreatedSession, type SessionMeta } from "./session.js";

/**
 * Where the two sign-in paths meet.
 *
 * Both Google and magic link resolve to "a verified email address", so account
 * linking is by email: signing in with Google after using a magic link (or the
 * reverse) lands on the same account rather than creating a duplicate.
 */

export interface AuthResult {
  user: { id: string; email: string; name: string | null; image: string | null };
  session: CreatedSession;
  isNewUser: boolean;
}

export async function signInWithGoogle(
  profile: GoogleProfile,
  meta: SessionMeta = {},
): Promise<AuthResult> {
  // Google can return an unverified address on some Workspace configurations.
  // Accepting one would let an attacker who controls an unverified Google
  // account take over an existing user by email match.
  if (!profile.emailVerified) {
    throw AppError.badRequest(
      "Your Google email isn't verified. Verify it with Google, or sign in with an email link instead.",
    );
  }

  const existingAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: "google",
        providerAccountId: profile.providerAccountId,
      },
    },
    select: { user: { select: { id: true, email: true, name: true, image: true } } },
  });

  if (existingAccount) {
    const user = existingAccount.user;
    return { user, session: await createSession(user.id, meta), isNewUser: false };
  }

  // No linked Google account yet. Either attach to the existing user with this
  // email, or create one.
  const existingUser = await prisma.user.findUnique({
    where: { email: profile.email },
    select: { id: true, email: true, name: true, image: true },
  });

  if (existingUser) {
    await prisma.account.create({
      data: {
        userId: existingUser.id,
        provider: "google",
        providerAccountId: profile.providerAccountId,
      },
    });

    // Backfill profile fields the magic-link path never had access to.
    const user = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name: existingUser.name ?? profile.name,
        image: existingUser.image ?? profile.image,
        emailVerifiedAt: new Date(),
      },
      select: { id: true, email: true, name: true, image: true },
    });

    return { user, session: await createSession(user.id, meta), isNewUser: false };
  }

  const user = await prisma.user.create({
    data: {
      email: profile.email,
      name: profile.name,
      image: profile.image,
      emailVerifiedAt: new Date(),
      accounts: {
        create: { provider: "google", providerAccountId: profile.providerAccountId },
      },
    },
    select: { id: true, email: true, name: true, image: true },
  });

  return { user, session: await createSession(user.id, meta), isNewUser: true };
}

export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      emailVerifiedAt: true,
      createdAt: true,
      subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
    },
  });
}

export async function updateProfile(
  userId: string,
  data: { name?: string | null },
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { name: data.name?.trim() || null },
  });
}

/**
 * Attaches an anonymous free audit to a freshly created account.
 *
 * This is the hinge of the whole funnel: the audit runs before signup, so at
 * signup we have to adopt it — creating the project, and moving the audit's
 * competitors, keywords, and opportunities into it — rather than making the
 * user start from an empty dashboard.
 */
export async function claimAudit(
  auditId: string,
  userId: string,
): Promise<{ projectId: string }> {
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    select: { id: true, domain: true, userId: true, projectId: true, status: true },
  });

  if (!audit) throw AppError.notFound("We couldn't find that audit.");
  if (audit.status !== "COMPLETED") {
    throw AppError.badRequest("That audit hasn't finished running yet.");
  }
  // Already owned by someone else — don't leak it into another account.
  if (audit.userId && audit.userId !== userId) {
    throw AppError.forbidden("That audit belongs to another account.");
  }
  if (audit.projectId) return { projectId: audit.projectId };

  const domain = normalizeDomain(audit.domain);

  const project = await prisma.project.upsert({
    where: { userId_domain: { userId, domain } },
    create: { userId, domain, name: domain },
    update: {},
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.audit.update({
      where: { id: audit.id },
      data: { userId, projectId: project.id, leadClaimed: true },
    }),
    // Carry the audit's recommendations into the project so the dashboard is
    // populated on first load.
    prisma.opportunity.updateMany({
      where: { auditId: audit.id, projectId: null },
      data: { projectId: project.id },
    }),
  ]);

  return { projectId: project.id };
}
