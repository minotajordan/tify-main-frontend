import { ApprovalPolicy, VerificationStatus } from './types';

// Configuration
export const DEFAULT_ORG_NAME = 'Acme Corp Global';
export const POLLING_INTERVAL = 30000; // 30 seconds

// Initial Empty States for Context/Reducers
export const INITIAL_USER_STATE = {
  id: '',
  fullName: 'Guest',
  email: '',
  username: '',
  isAdmin: false,
  createdAt: '',
};

// Fallback images
export const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=random';

export const SF_SYMBOLS = [
  'bell',
  'bell.circle',
  'globe',
  'exclamationmark.triangle',
  'mappin.and.ellipse',
  'bubble.left.and.bubble.right',
  'person.2',
  'shield.checkerboard',
  'lock',
  'megaphone',
  'bolt',
  'envelope',
  'paperplane',
  'phone',
  'waveform',
  'radio',
  'antenna.radiowaves.left.and.right',
  'camera',
  'photo',
  'clock',
  'calendar',
];

export const CHART_DATA_PLACEHOLDER = [
  { name: 'Mon', sent: 0, delivered: 0, read: 0 },
  { name: 'Tue', sent: 0, delivered: 0, read: 0 },
  { name: 'Wed', sent: 0, delivered: 0, read: 0 },
  { name: 'Thu', sent: 0, delivered: 0, read: 0 },
  { name: 'Fri', sent: 0, delivered: 0, read: 0 },
  { name: 'Sat', sent: 0, delivered: 0, read: 0 },
  { name: 'Sun', sent: 0, delivered: 0, read: 0 },
];
