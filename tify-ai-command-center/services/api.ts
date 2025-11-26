import { 
  Channel, 
  Message, 
  MessageListResponse, 
  User, 
  UserStats, 
  MessagePriority, 
  DeliveryMethod
} from '../types';

export const API_BASE = (() => {
  if (typeof window !== 'undefined') {
    const injected = (window as any).__API_BASE__;
    if (injected) return injected;
    const stored = localStorage.getItem('tify_api_base');
    if (stored) return stored;
  }
  if (typeof process !== 'undefined' && (process as any).env && (process as any).env.TIFY_API_BASE) {
    return (process as any).env.TIFY_API_BASE;
  }
  return 'http://192.168.3.149:3333/api';
})();
export function getAuthToken(): string | null {
  return typeof localStorage !== 'undefined' ? localStorage.getItem('tify_token') : null;
}
export function getCurrentUserId(): string | null {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1] || ''));
    return payload?.sub || null;
  } catch {
    return null;
  }
}



async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('tify_token') : null;
  const headers = { ...(options?.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) } as any;
  const startedAt = Date.now();
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('tify:request', { detail: { url, options: { ...options, headers }, startedAt } }));
    } catch {}
  }
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let payload: any = null;
    try { payload = await res.json(); } catch {}
    const text = payload?.error || (await res.text().catch(() => '')) || 'Error';
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tify:error', { detail: { status: res.status, code: payload?.code, error: text, url, payload, finishedAt: Date.now(), startedAt } }));
    }
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  const json = await res.json();
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('tify:response', { detail: { url, status: res.status, payload: options?.body, response: json, finishedAt: Date.now(), startedAt } }));
    } catch {}
  }
  return json;
}

export const api = {

  getCurrentUserId: () => getCurrentUserId() || '',
  getBootstrap: async (userId?: string): Promise<any> => {
    const uid = userId || getCurrentUserId();
    const query = new URLSearchParams(uid ? { userid: uid } : {} as any);
    return request(`${API_BASE}/app/bootstrap?${query.toString()}`);
  },
  // --- Channels ---
  getChannels: async (params?: { search?: string, isPublic?: boolean }): Promise<Channel[]> => {
    const uid = getCurrentUserId();
    const query = new URLSearchParams(uid ? { userId: uid } : {} as any);
    if (params?.search) query.append('search', params.search);
    if (params?.isPublic !== undefined) query.append('isPublic', String(params.isPublic));
    return request<Channel[]>(`${API_BASE}/channels?${query.toString()}`);
  },

  getChannelDetails: async (id: string): Promise<Channel & { messages: Message[] }> => {
    const uid = getCurrentUserId();
    const suffix = uid ? `?userId=${uid}` : '';
    return request<Channel & { messages: Message[] }>(`${API_BASE}/channels/${id}${suffix}`);
  },

  getSubchannels: async (parentId: string, page = 1, limit = 20): Promise<{ items: Array<Channel & { counts: { approvers: number; pending: number; sent: number } }>; pagination: { page: number; limit: number; total: number; pages: number } }> => {
    return request(`${API_BASE}/channels/${parentId}/subchannels?page=${page}&limit=${limit}`);
  },

  getChannelStats: async (id: string, range: '1h' | '24h' | '7d' | '1m' | 'all' = 'all'): Promise<{ delivered: number; read: number; unread: number; subscribers: number; approvers: number }> => {
    return request(`${API_BASE}/channels/${id}/stats?range=${range}`);
  },

  getChannelSubscribers: async (channelId: string, page = 1, limit = 20, q?: string): Promise<{ items: Array<{ id: string; user: User; subscribedAt: string }>; pagination: { page: number; limit: number; total: number; pages: number } }> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q) params.append('q', q);
    return request(`${API_BASE}/channels/${channelId}/subscriptions?${params.toString()}`);
  },

  // --- Messages ---
  getChannelMessages: async (
    channelId: string,
    page = 1,
    limit = 20,
    filters?: {
      q?: string;
      quick?: 'all' | 'emergency' | 'high' | 'vigent' | 'expired' | 'hasApprovals' | 'noApprovals';
      priority?: MessagePriority;
      emergency?: boolean;
      expired?: boolean;
      hasApprovals?: boolean;
      start?: string;
    }
  ): Promise<MessageListResponse> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters?.q) params.append('q', filters.q);
    if (filters?.quick) params.append('quick', filters.quick);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.emergency !== undefined) params.append('emergency', String(filters.emergency));
    if (filters?.expired !== undefined) params.append('expired', String(filters.expired));
    if (filters?.hasApprovals !== undefined) params.append('hasApprovals', String(filters.hasApprovals));
    if (filters?.start) params.append('start', filters.start);
    return request<MessageListResponse>(`${API_BASE}/messages/channel/${channelId}?${params.toString()}`);
  },

  getPendingApprovals: async (): Promise<Message[]> => {
    return request<Message[]>(`${API_BASE}/messages/pending/approval`);
  },

  getChannelPendingApprovals: async (channelId: string, page = 1, limit = 20): Promise<MessageListResponse> => {
    return request<MessageListResponse>(`${API_BASE}/messages/pending/approval/channel/${channelId}?page=${page}&limit=${limit}`);
  },

  getMessageApprovals: async (messageId: string): Promise<Array<{ userId: string; user: User; status: 'APPROVED' | 'REJECTED' | 'PENDING'; decidedAt?: string; removed?: boolean }>> => {
    return request(`${API_BASE}/messages/${messageId}/approvals`);
  },

  createMessage: async (payload: {
    channelId: string;
    content: string;
    priority: MessagePriority;
    isEmergency: boolean;
    categoryId: string;
    senderId: string;
    isImmediate?: boolean;
    deliveryMethod?: DeliveryMethod;
    publishedAt?: string;
    eventAt?: string;
    expiresAt?: string;
  }): Promise<{ message: string, data: Message }> => {
    return request(`${API_BASE}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  approveMessage: async (id: string): Promise<any> => {
    return request(`${API_BASE}/messages/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approverId: getCurrentUserId() })
    });
  },

  rejectMessage: async (id: string): Promise<any> => {
    return request(`${API_BASE}/messages/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approverId: getCurrentUserId() })
    });
  },

  cancelMessage: async (id: string): Promise<any> => {
    return request(`${API_BASE}/messages/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requesterId: getCurrentUserId() })
    });
  },

  viewMessage: async (id: string): Promise<{ ok: boolean }> => {
    return request(`${API_BASE}/messages/${id}/view`, { method: 'POST' });
  },

  getMessageViews: async (id: string): Promise<{ total: number; uniqueViewers: number; viewers: Array<{ id: string; username: string; fullName: string; count: number }> }> => {
    return request(`${API_BASE}/messages/${id}/views`);
  },

  visitChannel: async (id: string): Promise<{ ok: boolean }> => {
    return request(`${API_BASE}/channels/${id}/visit`, { method: 'POST' });
  },

  getChannelVisits: async (id: string): Promise<{ total: number; uniqueVisitors: number }> => {
    return request(`${API_BASE}/channels/${id}/visits`);
  },

  // --- Users ---
  getUsers: async (): Promise<User[]> => {
    return request<User[]>(`${API_BASE}/users`);
  },

  getUsersPaged: async (page = 1, limit = 20, q?: string): Promise<{ items: User[]; pagination: { page: number; limit: number; total: number; pages: number } }> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q) params.append('q', q);
    return request(`${API_BASE}/users/paged?${params.toString()}`);
  },

  createUser: async (payload: { email: string; username: string; fullName?: string; phoneNumber?: string; avatarUrl?: string; isAdmin?: boolean; password?: string }): Promise<User> => {
    return request<User>(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  getUserProfile: async (id: string): Promise<User> => {
    return request<User>(`${API_BASE}/users/${id}`);
  },

  getUserStats: async (id: string): Promise<UserStats> => {
    return request<UserStats>(`${API_BASE}/users/${id}/stats`);
  },

  getUserActivity: async (id: string, range: '1h'|'24h'|'7d'|'1m'|'all' = '24h'): Promise<{ sentInRange: number; deliveriesInRange: number; read: number; unread: number }> => {
    return request(`${API_BASE}/users/${id}/activity?range=${range}`);
  },

  getUserTopChannels: async (id: string, range: '1h'|'24h'|'7d'|'1m'|'all' = '24h'): Promise<{ items: Array<{ channel: { id: string; title: string; icon?: string; logoUrl?: string }, count: number }> }> => {
    return request(`${API_BASE}/users/${id}/top-channels?range=${range}`);
  },

  getUserAuditLogs: async (id: string, page = 1, limit = 20): Promise<{ items: any[]; pagination: any }> => {
    return request(`${API_BASE}/users/${id}/audit-logs?page=${page}&limit=${limit}`);
  },

  getUserSubscriptions: async (id: string): Promise<any[]> => {
    return request<any[]>(`${API_BASE}/users/${id}/subscriptions`);
  },

  removeSubscription: async (userId: string, channelId: string): Promise<{ message: string }> => {
    return request(`${API_BASE}/subscriptions`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, channelId })
    });
  },

  disableUser: async (id: string): Promise<{ id: string; isDisabled: boolean }> => {
    return request(`${API_BASE}/users/${id}/disable`, { method: 'PATCH' });
  },
  enableUser: async (id: string): Promise<{ id: string; isDisabled: boolean }> => {
    return request(`${API_BASE}/users/${id}/enable`, { method: 'PATCH' });
  },
  deleteUser: async (id: string): Promise<{ deleted: { id: string } }> => {
    return request(`${API_BASE}/users/${id}`, { method: 'DELETE' });
  },

  getUserApproverAssignments: async (id: string): Promise<any[]> => {
    return request<any[]>(`${API_BASE}/users/${id}/approver-assignments`);
  },

  getUserPendingApprovals: async (id: string, windowHours = 24): Promise<Message[]> => {
    return request<Message[]>(`${API_BASE}/users/${id}/pending-approvals?windowHours=${windowHours}`);
  },

  requestUserVerificationCode: async (id: string): Promise<{ id: string; verificationCode: string; verificationCodeExpiresAt: string }> => {
    return request(`${API_BASE}/users/${id}/request-verification-code`, {
      method: 'POST'
    });
  },

  createChannel: async (payload: {
    title: string;
    description?: string;
    icon?: string;
    logoUrl?: string;
    parentId?: string;
    ownerId: string;
    organizationId: string;
    isPublic?: boolean;
    isHidden?: boolean;
    searchExactOnly?: boolean;
    password?: string;
    referenceCode?: string;
    approvalPolicy?: 'REQUIRED' | 'OPTIONAL' | 'DISABLED';
    websiteUrl?: string;
    socialLinks?: Record<string, string>;
  }): Promise<Channel> => {
    return request<Channel>(`${API_BASE}/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  createSubchannel: async (parentId: string, payload: {
    title: string;
    description?: string;
    icon?: string;
    logoUrl?: string;
    ownerId: string;
    organizationId: string;
    isPublic?: boolean;
    isHidden?: boolean;
    searchExactOnly?: boolean;
    password?: string;
    referenceCode?: string;
    approvalPolicy?: 'REQUIRED' | 'OPTIONAL' | 'DISABLED';
    websiteUrl?: string;
    socialLinks?: Record<string, string>;
  }): Promise<Channel> => {
    return request<Channel>(`${API_BASE}/channels/${parentId}/subchannels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  addChannelApprover: async (channelId: string, userId: string): Promise<any> => {
    return request(`${API_BASE}/channels/${channelId}/approvers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
  },

  removeChannelApprover: async (channelId: string, userId: string): Promise<any> => {
    return request(`${API_BASE}/channels/${channelId}/approvers/${userId}`, {
      method: 'DELETE'
    });
  },

  authHasUsers: async (): Promise<{ hasUsers: boolean }> => {
    return request(`${API_BASE}/auth/has-users`);
  },

  authNeedsBootstrap: async (): Promise<{ needsBootstrap: boolean; targetUsername: string }> => {
    return request(`${API_BASE}/auth/needs-bootstrap`);
  },

  authBootstrapAdmin: async (payload: { email: string; username: string; fullName?: string; password: string; phoneNumber?: string; code: string }): Promise<User> => {
    const res = await request<{ token: string; user: User }>(`${API_BASE}/auth/bootstrap-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    localStorage.setItem('tify_token', res.token);
    return res.user;
  },

  authLogin: async (payload: { identifier: string; password: string }): Promise<User> => {
    const res = await request<{ token: string; user: User }>(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    localStorage.setItem('tify_token', res.token);
    return res.user;
  },

  authRequestPasswordReset: async (payload: { identifier: string }): Promise<{ ok: boolean; message: string; requestedAt: string }> => {
    return request(`${API_BASE}/auth/request-password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  authResetPassword: async (payload: { identifier: string; code: string; newPassword: string }): Promise<User> => {
    const res = await request<{ token: string; user: User }>(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    localStorage.setItem('tify_token', res.token);
    return res.user;
  },

  authMe: async (): Promise<User> => {
    return request<User>(`${API_BASE}/auth/me`);
  }
};