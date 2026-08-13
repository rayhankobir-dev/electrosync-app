/**
 * Hand-mirrored from the NestJS DTOs. These are the wire shapes, so they use
 * the backend's conventions verbatim — notably that every timestamp coming out
 * of the `nesco` module is Unix epoch **seconds**, not milliseconds.
 */

export type IssuedToken = {
  accessToken: string;
  /** Lifetime in seconds. There is no refresh endpoint — re-login after this. */
  expiresIn: number;
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean | null;
  mobile: string | null;
  /** ISO 8601 string over the wire, despite being a `Date` on the server. */
  createdAt: string;
};

/**
 * Email is missing on purpose — it is the login identity and carries
 * `emailVerified`, so the backend does not accept it here. An empty `mobile`
 * clears the stored number; omitting the key leaves it untouched.
 */
export type UpdateProfilePayload = {
  name?: string;
  mobile?: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  mobile?: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type ForgotPasswordPayload = {
  email: string;
};

/**
 * The server answers this with an `IssuedToken`, exactly as `/auth/login` does —
 * redeeming a code signs the user in, so there is no separate login step.
 */
export type ResetPasswordPayload = {
  email: string;
  /** Exactly six digits, and zero-padded — keep it a string. */
  code: string;
  password: string;
};

/**
 * For a user who is already signed in and knows their password. The server
 * answers 204 rather than a token: nothing about the session changes, including
 * the token that made the request.
 */
export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

/** What the meter is for. Presentation only — nothing routes on it. */
export type MeterType = 'HOME' | 'OFFICE' | 'INDUSTRY';

export const METER_TYPES: readonly MeterType[] = ['HOME', 'OFFICE', 'INDUSTRY'];

/**
 * Who supplies the meter. This is what data fetching dispatches on. Only NESCO
 * has a backend data source today.
 */
export type MeterProvider = 'NESCO' | 'DESCO' | 'DPDC';

export const METER_PROVIDERS: readonly MeterProvider[] = [
  'NESCO',
  'DESCO',
  'DPDC',
];

export type Meter = {
  id: string;
  customerNo: string;
  type: MeterType;
  provider: MeterProvider;
  label: string | null;
  isPrimary: boolean;
  createdAt: string;
};

export type AddMeterPayload = {
  customerNo: string;
  /** Omitted means HOME — the server applies the default. */
  type?: MeterType;
  /** Omitted means NESCO — the server applies the default. */
  provider?: MeterProvider;
  label?: string;
};

export type UpdateMeterPayload = {
  label?: string;
  isPrimary?: boolean;
};

export type NescoBalance = {
  consumerNo: string;
  balance: number;
};

export type NescoCustomerInfo = {
  consumerNo: string;
  name: string;
  address: string;
  office: string;
  feeder: string;
  meterNo: string;
  meterType: string;
  meterStatus: string;
  meterInstalledAt: number;
  approvedLoad: number;
  minimumRecharge: number;
  currentBalance: number;
};

export type NescoRecharge = {
  sn: number;
  token: string;
  meterRentAmount: number;
  demandChargeAmount: number;
  vatAmount: number;
  concessionAmount: number;
  rechargeAmount: number;
  usableAmount: number;
  rechargeMethod: string;
  rechargedDate: number;
  rechargeStatus: string;
};

export type NescoMonthlyConsumption = {
  year: number;
  /** Rendered by the portal in Bangla, e.g. `'জানুয়ারি'`. */
  month: string;
  totalRechargeAmount: number;
  totalConcessionAmount: number;
  totalElectricityChargeAmount: number;
  meterRentAmount: number;
  demandChargeAmount: number;
  totalVatAmount: number;
  totalUsageAmount: number;
  remainingMeterBalance: number;
  totalUsageInKwh: number;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  archivedAt: string | null;
  sentAt: string;
  createdAt: string;
};

export type DevicePlatform = 'ios' | 'android' | 'web';

export type RegisterDeviceTokenPayload = {
  token: string;
  platform: DevicePlatform;
  deviceId?: string;
};

export type UserSettings = {
  pushEnabled: boolean;
  lowBalanceAlerts: boolean;
  lowBalanceThreshold: number;
  rechargeAlerts: boolean;
  /** Alert when a day's usage jumps well above the meter's recent normal. */
  usageAnomalyAlerts: boolean;
  /**
   * How far above the trailing 14-day baseline a day has to land to count as
   * an anomaly, as a **percentage** — 40 means "40% above normal", not 40x.
   *
   * A percentage rather than a taka amount, unlike `lowBalanceThreshold`,
   * because the meaningful quantity is relative: ৳30 over normal is noise on an
   * industrial connection and a doubling on a one-room flat.
   */
  usageAnomalyThreshold: number;
  /**
   * Extra channels an alert is delivered on, on top of the push notification.
   * All three default to off server-side — push is the channel installing the
   * app already consented to, a message to a handset or inbox is a separate ask.
   */
  whatsappAlerts: boolean;
  smsAlerts: boolean;
  emailAlerts: boolean;
  /**
   * Where those two go, when it is not the account's own number.
   *
   * Null is the normal state, not a missing value: it means "use the mobile on
   * the profile". A string is an override the user typed because the profile has
   * no number to fall back to, or because the alert should reach a different
   * handset from the one they sign in with. Sending null clears the override.
   *
   * Email has no counterpart — it is the login identity, so there is always one
   * address and it is always the right one.
   */
  whatsappNumber: string | null;
  smsNumber: string | null;
  language: 'en' | 'bn';
  theme: 'light' | 'dark' | 'system';
};

export type UpdateUserSettingsPayload = Partial<UserSettings>;

/**
 * How `/analytics/usage` buckets its samples.
 *
 * `weekday` returns exactly seven points — the mean cost for each day of the
 * week — and only says something the daily series doesn't once the range spans
 * several weeks.
 */
export type UsageGranularity = 'daily' | 'weekly' | 'weekday';

export type UsagePoint = {
  /** Bucket start as an Asia/Dhaka calendar date. Absent for `weekday`. */
  date?: string;
  /** ISO day of week, 1 = Monday … 7 = Sunday. Only for `weekday`. */
  weekday?: number;
  consumedCost: number;
  rechargedAmount: number;
  /**
   * Fraction of the bucket covered by readings, 0–1.
   *
   * Below 1 the cost is a floor, not a total. Charting it as a normal value
   * would show missing data as a cheap day, so the UI marks these points
   * rather than hiding the distinction.
   */
  coverage: number;
};

export type UsageAnalytics = {
  granularity: UsageGranularity;
  currency: string;
  meterCount: number;
  /** Distinct days in range carrying at least one reading. */
  observedDays: number;
  points: UsagePoint[];
  total: { consumedCost: number; rechargedAmount: number };
};

export type UsageAnalyticsQuery = {
  granularity: UsageGranularity;
  /** Inclusive, `YYYY-MM-DD`, Asia/Dhaka. */
  from: string;
  /** Inclusive, `YYYY-MM-DD`, Asia/Dhaka. */
  to: string;
  meterId?: string;
};
