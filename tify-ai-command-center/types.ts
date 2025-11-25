export enum VerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  VERIFIED = 'VERIFIED',
  VERIFIED_CERTIFIED = 'VERIFIED_CERTIFIED'
}

export enum ApprovalPolicy {
  REQUIRED = 'REQUIRED',
  OPTIONAL = 'OPTIONAL',
  DISABLED = 'DISABLED'
}

export enum MessagePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  READ = 'READ'
}

export enum CategoryScope {
  GLOBAL = 'GLOBAL',
  CHANNEL = 'CHANNEL'
}

export enum DeliveryMethod {
  PUSH = 'PUSH',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  TELEGRAM = 'TELEGRAM',
  EMAIL = 'EMAIL',
  BOTH = 'BOTH'
}

export interface UserProfileShort {
  id: string;
  username: string;
  fullName: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  phoneNumber?: string;
  isAdmin: boolean;
  isDisabled?: boolean;
  createdAt: string;
  isGuest?: boolean;
  isPhoneVerified?: boolean;
  verificationCode?: string | null;
  verificationCodeExpiresAt?: string | null;
  subscribedChannelsCount?: number;
  messagesCount?: number;
  ownedChannelsCount?: number;
  pendingApprovalsCount?: number;
  avatarUrl?: string;
}

export interface Channel {
  id: string;
  title: string;
  description?: string;
  logoUrl?: string;
  icon: string;
  memberCount: number;
  isPublic: boolean;
  isHidden: boolean;
  searchExactOnly: boolean;
  referenceCode?: string;
  approvalPolicy: ApprovalPolicy;
  verificationStatus?: VerificationStatus; // Mapped from API if present or derived
  ownerId: string;
  organizationId: string;
  parentId?: string | null;
  createdAt: string;
  owner: UserProfileShort;
  subchannels?: Channel[];
  approvers?: { id: string; userId: string; user: UserProfileShort }[];
  _count?: {
    subscriptions: number;
    messages?: number;
  };
  isSubscribed?: boolean;
  subscribedAt?: string;
}

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  categoryId: string;
  content: string;
  durationSeconds?: number;
  expiresAt?: string;
  isEmergency: boolean;
  isImmediate: boolean;
  priority: MessagePriority;
  deliveryMethod: DeliveryMethod;
  eventAt?: string;
  publishedAt?: string;
  state?: 'ACTIVE' | 'CANCELLED';
  createdAt?: string; // Optional depending on endpoint
  sender: UserProfileShort;
  channel?: {
    title: string;
    icon: string;
  };
  status?: 'APPROVED' | 'PENDING' | 'REJECTED'; // Derived for UI
  approvalOverride?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface MessageListResponse {
  messages: Message[];
  pagination: Pagination;
}

export interface UserStats {
  subscribedChannelsCount: number;
  messagesCount: number;
  ownedChannelsCount: number;
  pendingApprovalsCount: number;
  recentActivity: any[];
}

export interface StatMetric {
  label: string;
  value: string | number;
  change?: number;
  icon: any;
}