import { createContext, use, useMemo, useState, type ReactNode } from 'react';

import type { Meter } from '@/api/types';

import { MeterForm } from './meter-form';

export type MeterFormApi = {
  /** Opens the sheet with an empty form. */
  add(): void;
  /** Opens the sheet prefilled from an existing meter. */
  edit(meter: Meter): void;
};

const MeterFormContext = createContext<MeterFormApi | null>(null);

/**
 * Hosts the add/edit sheet above the tab navigator, so both the tab bar's
 * action button and the screens inside it can open the same form. The sheet is
 * mounted only while open: `MeterForm` seeds its fields from props in
 * `useState`, so a fresh mount is what makes "edit" show that meter's values.
 */
export function MeterFormHost({ children }: { children: ReactNode }) {
  // `null` is closed. `{ meter: null }` is adding; a meter is editing.
  const [open, setOpen] = useState<{ meter: Meter | null } | null>(null);

  const api = useMemo<MeterFormApi>(
    () => ({
      add: () => setOpen({ meter: null }),
      edit: (meter) => setOpen({ meter }),
    }),
    [],
  );

  return (
    <MeterFormContext value={api}>
      {children}
      {open ? (
        <MeterForm visible meter={open.meter} onClose={() => setOpen(null)} />
      ) : null}
    </MeterFormContext>
  );
}

export function useMeterForm(): MeterFormApi {
  const context = use(MeterFormContext);
  if (!context) throw new Error('useMeterForm must be used inside <MeterFormHost>.');
  return context;
}
