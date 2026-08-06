import { useMutation } from '@tanstack/react-query';

import type { UpdateProfilePayload } from '@/api/types';
import { useSession } from '@/session';

/**
 * Saves name and mobile.
 *
 * The request itself belongs to the session, which owns the cached profile —
 * this wrapper exists for the mutation lifecycle around it, so the form can
 * disable its button on `isPending` the same way every other form here does.
 * There is no query key: nothing reads the profile out of the query cache.
 */
export function useUpdateProfile() {
  const { updateProfile } = useSession();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(payload),
  });
}
