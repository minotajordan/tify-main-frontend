export enum VerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  VERIFIED = 'VERIFIED',
  VERIFIED_CERTIFIED = 'VERIFIED_CERTIFIED',
}

export enum ApprovalPolicy {
  REQUIRED = 'REQUIRED',
  OPTIONAL = 'OPTIONAL',
  DISABLED = 'DISABLED',
}

export enum MessagePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  READ = 'READ',
}

export enum CategoryScope {
  GLOBAL = 'GLOBAL',
  CHANNEL = 'CHANNEL',
}

export enum DeliveryMethod {
  PUSH = 'PUSH',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  TELEGRAM = 'TELEGRAM',
  EMAIL = 'EMAIL',
  BOTH = 'BOTH',
}

export interface UserProfileShort {
  id: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
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
  websiteUrl?: string;
  socialLinks?: Record<string, string>;
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
  priority: MessagePriority;
  content: string;
  isImmediate: boolean;
  isEmergency: boolean;
  deliveryMethod: DeliveryMethod;
  status: string; // 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SENT'
  rejectionReason?: string;
  publishedAt?: string;
  eventAt?: string;
  expiresAt?: string;
  extra?: any;
  createdAt: string;
  sender: UserProfileShort;
  channel: { title: string; icon: string };
  category?: { name: string; color: string };
  approvals?: {
    id: string;
    approverId: string;
    status: string;
    createdAt: string;
    approver: UserProfileShort;
  }[];
  attachments?: {
    id: string;
    url: string;
    type: string;
    name: string;
    size: number;
  }[];
  readCount?: number;
  deliveryStats?: {
    total: number;
    delivered: number;
    read: number;
    failed: number;
  };
}

export interface MessageListResponse {
  messages: Message[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface UserStats {
  totalMessages: number;
  totalChannels: number;
  pendingApprovals: number;
  unreadMessages: number;
  subscribedChannelsCount?: number;
  messagesCount?: number;
  ownedChannelsCount?: number;
  pendingApprovalsCount?: number;
  recentActivity?: any[];
}

// --- EVENTS MODULE TYPES ---

export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CANCELLED = 'CANCELLED',
  ENDED = 'ENDED',
}

export enum SeatStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  SOLD = 'SOLD',
  BLOCKED = 'BLOCKED',
  CHECKED_IN = 'CHECKED_IN',
}

export interface EventZone {
  id: string;
  eventId: string;
  name: string;
  color: string;
  price: number;
  rows: number;
  cols: number;
  capacity?: number;
  type: 'SALE' | 'INFO' | 'STAGE';
  layout?: { x: number; y: number; width?: number; height?: number };
  seatGap?: number;
  seatGapX?: number;
  seatGapY?: number;
  startNumber?: number;
  numberingDirection?: 'LTR' | 'RTL';
  verticalDirection?: 'TTB' | 'BTT';
  numberingMode?: 'ROW' | 'COLUMN';
  continuousNumbering?: boolean;
  numberingSnake?: boolean;
  rowLabelType?: 'Alpha' | 'Numeric' | 'Roman';
  rotation?: number; // Degrees
  seats?: EventSeat[];
  _count?: { tickets: number };
}

export interface EventSeat {
  id: string;
  zoneId: string;
  rowLabel: string;
  colLabel: string; // number or letter
  status: SeatStatus;
  holderName?: string;
  ticketCode?: string;
  type: 'REGULAR' | 'VIP' | 'ACCESSIBLE';
  price?: number;
  x?: number | null;
  y?: number | null;
  gridRow?: number;
  gridCol?: number;
}

export interface TifyEvent {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  imageUrl?: string;
  status: EventStatus;
  categories: string[];
  paymentInfo?: string;
  zones: EventZone[];
  seats: EventSeat[];
  createdAt: string;
  updatedAt: string;
  organizerId: string;
  // Local Event Fields
  privacy?: 'public' | 'private_link' | 'private_password';
  password?: string;
  guestsPerInviteMode?: 'fixed' | 'variable';
  guestsPerInvite?: number;
  templateStyle?: 'card-1' | 'card-2'; // Visual template style
  reservationMode?: 'predetermined' | 'random' | 'manual';
  guestList?: LocalEventGuest[];
}

export interface LocalEventGuest {
  id?: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  country?: string;
  quota?: number;
  token?: string;
  status?: 'pending' | 'confirmed' | 'declined';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  additionalData?: Record<string, any>;
  linkAccessCount?: number;
  infoFilled?: boolean;
  updatedAt?: string;
}
