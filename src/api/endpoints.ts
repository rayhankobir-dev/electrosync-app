import type { ApiClient } from './client';
import type {
  AddMeterPayload,
  IssuedToken,
  LoginPayload,
  Meter,
  NescoBalance,
  NescoCustomerInfo,
  NescoMonthlyConsumption,
  NescoRecharge,
  Notification,
  RegisterDeviceTokenPayload,
  RegisterPayload,
  UpdateMeterPayload,
  UpdateProfilePayload,
  UpdateUserSettingsPayload,
  UsageAnalytics,
  UsageAnalyticsQuery,
  UserProfile,
  UserSettings,
} from './types';

/**
 * One function per backend route, so no screen ever builds a URL. Grouped to
 * match the controllers they came from.
 */
export function createEndpoints(client: ApiClient) {
  return {
    auth: {
      register: (payload: RegisterPayload) =>
        client.request<IssuedToken>('/auth/register', {
          method: 'POST',
          body: payload,
          anonymous: true,
        }),

      login: (payload: LoginPayload) =>
        client.request<IssuedToken>('/auth/login', {
          method: 'POST',
          body: payload,
          anonymous: true,
        }),

      me: () => client.request<UserProfile>('/auth/me'),
    },

    meters: {
      list: () => client.request<Meter[]>('/meters'),

      add: (payload: AddMeterPayload) =>
        client.request<Meter>('/meters', { method: 'POST', body: payload }),

      update: (id: string, payload: UpdateMeterPayload) =>
        client.request<Meter>(`/meters/${id}`, { method: 'PATCH', body: payload }),

      remove: (id: string) =>
        client.request<void>(`/meters/${id}`, { method: 'DELETE' }),
    },

    // These four routes are `@Public()` on the server, so they deliberately go
    // out without an Authorization header.
    nesco: {
      balance: (customerNo: string) =>
        client.request<NescoBalance>(`/nesco/${customerNo}/balance`, { anonymous: true }),

      info: (customerNo: string) =>
        client.request<NescoCustomerInfo>(`/nesco/${customerNo}/info`, { anonymous: true }),

      recharges: (customerNo: string) =>
        client.request<NescoRecharge[]>(`/nesco/${customerNo}/recharges`, { anonymous: true }),

      consumption: (customerNo: string) =>
        client.request<NescoMonthlyConsumption[]>(`/nesco/${customerNo}/consumption`, {
          anonymous: true,
        }),
    },

    notifications: {
      list: (query?: { includeArchived?: boolean; limit?: number }) =>
        client.request<Notification[]>('/notifications', { query }),

      markAsRead: (id: string) =>
        client.request<Notification>(`/notifications/${id}/read`, { method: 'PATCH' }),

      registerToken: (payload: RegisterDeviceTokenPayload) =>
        client.request<void>('/notifications/tokens', { method: 'POST', body: payload }),

      unregisterToken: (token: string) =>
        client.request<void>(`/notifications/tokens/${encodeURIComponent(token)}`, {
          method: 'DELETE',
        }),
    },

    analytics: {
      /**
       * Consumption derived from the scheduled balance sweep, so resolution is
       * bounded by how often it runs — there is no hourly view to ask for.
       */
      usage: (query: UsageAnalyticsQuery) =>
        client.request<UsageAnalytics>('/analytics/usage', { query }),
    },

    users: {
      updateProfile: (payload: UpdateProfilePayload) =>
        client.request<UserProfile>('/users/me', { method: 'PATCH', body: payload }),
    },

    settings: {
      get: () => client.request<UserSettings>('/users/me/settings'),

      update: (payload: UpdateUserSettingsPayload) =>
        client.request<UserSettings>('/users/me/settings', {
          method: 'PATCH',
          body: payload,
        }),
    },
  };
}

export type Endpoints = ReturnType<typeof createEndpoints>;
