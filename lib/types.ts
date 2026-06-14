// All inTrack SDK type definitions — exported for explicit use in components and pages.

export type PushSubscriptionStatus =
  | 'subscribed'
  | 'unsubscribed'
  | 'denied'
  | 'canceled'
  | 'no_init';

export interface InTrackConfig {
  app_key: string;
  auth_key: string;
  public_key: string;
  environment: 'production' | 'stage';
  debug?: boolean;
  sw_path?: string;
}

export interface UserDetails {
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  country?: string;
  state?: string;
  city?: string;
  gender?: 'male' | 'female' | 'other';
  birthday?: string;
  company?: string;
  hashedPhone?: string;
  hashedEmail?: string;
  smsOptIn?: boolean;
  emailOptIn?: boolean;
  pushOptIn?: boolean;
  webPushOptIn?: boolean;
  attributes?: Record<string, unknown>;
}

export interface InTrackEvent {
  eventName: string;
  userId?: string;
  eventData?: Record<string, unknown>;
}

export interface SubscriptionStyle {
  subscriptionTheme?: 0 | 1 | 2 | 3 | 4;
  subscriptionThemePos?: 1 | 2 | 3;
  subscriptionOverlayOpacity?: number;
  subscriptionBoxColor?: string;
  subscriptionBtnAllowTxt?: string;
  subscriptionBtnAllowColor?: string;
  subscriptionBtnAllowTxtColor?: string;
  subscriptionBtnDenyTxt?: string;
  subscriptionBtnDenyColor?: string;
  subscriptionBtnDenyTxtColor?: string;
  subscriptionTitle?: string;
  subscriptionTitleTxtColor?: string;
  subscriptionMessage?: string;
  subscriptionMessageTxtColor?: string;
  subscriptionBoxDelay?: number;
}

export interface WidgetConfig {
  enable?: boolean;
  enableUnsubs?: boolean;
  color?: string;
  icon?: string;
  style?: {
    position?: 'left' | 'right';
    tickerRight?: number;
    tickerLeft?: number;
    tickerBottom?: number;
    notifLeft?: number;
    notifRight?: number;
    notifBottom?: number;
  };
  messages?: Record<string, string>;
}

export interface WebPushConfig {
  subscriptionStyle?: SubscriptionStyle;
  subscriptionStyleMobileSeparate?: boolean;
  subscriptionStyleMobile?: SubscriptionStyle;
  isRTL?: boolean;
  askAgainAfterDays?: number;
  widget?: WidgetConfig;
}
