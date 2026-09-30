/** Serialize session cookie mutations: an older login must never finish after a newer one. */
export function createSessionQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return {
    run<T>(operation: () => Promise<T>): Promise<T> {
      const result = tail.then(operation);
      tail = result.catch(() => undefined);
      return result;
    },
  };
}

export const sessionQueue = createSessionQueue();

export function storeSelectionKey(uid: string, companyId: string) {
  return `selected_store:${encodeURIComponent(uid)}:${encodeURIComponent(companyId)}`;
}

export function isPublicAuthPath(pathname: string) {
  return ["/availability", "/login", "/staff/login", "/entry", "/customers/intake", "/kiosk/attendance", "/link-line", "/privacy", "/lp"].some(
    path => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/** Each async authentication loader owns one revision; only the latest may commit. */
export function createAuthRevision() {
  let revision = 0;
  return {
    next: () => ++revision,
    current: () => revision,
    isCurrent: (candidate: number) => candidate === revision,
  };
}
