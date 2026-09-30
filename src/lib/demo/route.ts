/** This boundary selects a mock UI, never an authenticated production role. */
export function isDemoPath(pathname: string) {return pathname === '/demo' || pathname.startsWith('/demo/');}
