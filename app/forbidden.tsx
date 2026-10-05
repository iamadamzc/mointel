import { NotAdmitted } from '@/components/NotAdmitted';

/**
 * What `forbidden()` renders, with a 403. Only `/desk` calls it, for a signed-in
 * person the allowlist does not admit. The gate returns no address, so the
 * screen renders without one (its `email` prop is optional for that reason).
 */
export default function Forbidden() {
  return <NotAdmitted />;
}
