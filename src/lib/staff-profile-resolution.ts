export type StaffProfileCandidate = {
  id: string;
  uid?: string | null;
};

/**
 * Selects the one profile that may represent the authenticated user.
 * A UID match is authoritative. A profile without a UID is accepted only as
 * a single legacy fallback; a profile bound to another UID is never used.
 */
export function resolveStaffProfileCandidate<T extends StaffProfileCandidate>(
  candidates: T[],
  authenticatedUid: string,
): T | null {
  const uidMatches = candidates.filter((candidate) => candidate.uid === authenticatedUid);

  if (uidMatches.length > 1) {
    throw new Error("Multiple staff profiles are linked to the authenticated UID");
  }
  if (uidMatches.length === 1) {
    return uidMatches[0];
  }

  const legacyCandidates = candidates.filter((candidate) => !candidate.uid);
  if (legacyCandidates.length > 1) {
    throw new Error("Multiple legacy staff profiles share the authenticated email");
  }

  return legacyCandidates[0] ?? null;
}
