// Subscription-related types for monetization system

export type SubscriptionType = 'monthly' | 'yearly' | null;
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial' | 'inactive';
export type PromoDiscountType = 'percentage' | 'fixed';
export type SubscriptionAction = 
  | 'trial_started' 
  | 'trial_ended' 
  | 'subscription_started' 
  | 'subscription_renewed' 
  | 'subscription_cancelled' 
  | 'subscription_expired' 
  | 'plan_changed';

export interface SubscriptionProfile {
  id: string;
  is_paid: boolean;
  is_trial: boolean;
  trial_started_at: string | null;
  trial_ended_at: string | null;
  subscription_type: SubscriptionType;
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
  subscription_status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  has_used_trial: boolean;
  trial_days_remaining: number;
}

export interface SubscriptionHistory {
  id: string;
  user_id: string;
  action: SubscriptionAction;
  subscription_type: SubscriptionType;
  amount: number | null;
  currency: string;
  stripe_payment_intent_id: string | null;
  stripe_invoice_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface PaymentMethod {
  id: string;
  user_id: string;
  stripe_payment_method_id: string;
  card_brand: string | null;
  card_last4: string | null;
  card_exp_month: number | null;
  card_exp_year: number | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromotionalCode {
  id: string;
  code: string;
  discount_type: PromoDiscountType;
  discount_value: number;
  applicable_plans: SubscriptionType[];
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  is_active: boolean;
}

export interface UserPromotionalCode {
  id: string;
  user_id: string;
  promo_code_id: string;
  used_at: string;
  subscription_id: string | null;
}

// Pricing configuration
export const PRICING = {
  monthly: {
    price: 3.00,
    currency: 'USD',
    interval: 'month' as const,
    name: 'Monthly Plan',
    description: 'Billed monthly',
    features: [
      'Unlimited topics',
      'Advanced statistics',
      'Export features',
      'Priority support',
      'Sync across devices'
    ]
  },
  yearly: {
    price: 30.00,
    currency: 'USD',
    interval: 'year' as const,
    name: 'Yearly Plan',
    description: 'Billed yearly (Save $6!)',
    savings: 6.00,
    features: [
      'Everything in Monthly',
      '2 months free',
      'Early access to new features',
      'Custom learning modes',
      'Bulk import/export'
    ]
  },
  trial: {
    days: 7,
    name: 'Free Trial',
    description: '7 days of full access',
    features: [
      'Full app access for 7 days',
      'No credit card required',
      'Cancel anytime',
      'All premium features',
      'One-time offer'
    ]
  }
} as const;

// Subscription helper functions
export const isSubscriptionActive = (profile: SubscriptionProfile): boolean => {
  if (profile.is_trial && profile.trial_ended_at) {
    return new Date(profile.trial_ended_at) > new Date();
  }
  
  if (profile.is_paid && profile.subscription_expires_at) {
    return new Date(profile.subscription_expires_at) > new Date();
  }
  
  return false;
};

export const getSubscriptionDaysRemaining = (profile: SubscriptionProfile): number => {
  let expiresAt: Date | null = null;
  
  if (profile.is_trial && profile.trial_ended_at) {
    expiresAt = new Date(profile.trial_ended_at);
  } else if (profile.is_paid && profile.subscription_expires_at) {
    expiresAt = new Date(profile.subscription_expires_at);
  }
  
  if (!expiresAt) return 0;
  
  const now = new Date();
  const diffTime = expiresAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
};

export const formatSubscriptionStatus = (profile: SubscriptionProfile): string => {
  if (profile.is_trial) {
    const daysRemaining = getSubscriptionDaysRemaining(profile);
    return `Trial (${daysRemaining} days left)`;
  }
  
  if (profile.is_paid) {
    if (profile.subscription_type === 'monthly') {
      return 'Monthly Subscriber';
    } else if (profile.subscription_type === 'yearly') {
      return 'Yearly Subscriber';
    }
  }
  
  if (profile.has_used_trial) {
    return 'Trial Expired';
  }
  
  return 'Free Account';
};

export const canStartTrial = (profile: SubscriptionProfile): boolean => {
  return !profile.has_used_trial && !profile.is_paid;
};

// Statistics for paywall
export const PAYWALL_STATS = {
  retentionImprovement: 47,
  gradeImprovement: 15,
  activeUsers: '10,000+',
  statistics: [
    { icon: '📈', value: '88%', label: 'Average Test Scores' },
    { icon: '⚡', value: '3x Faster', label: 'Learning Speed' },
    { icon: '🧠', value: '140+ Years', label: 'Of Research' },
    { icon: '🔬', value: 'Proven', label: 'By Neuroscience' }
  ],
  research: [
    {
      author: 'Hermann Ebbinghaus (1880s)',
      role: 'Pioneer of Memory Research',
      text: 'Created the "forgetting curve" showing that spaced review intervals dramatically improve long-term retention compared to massed practice.',
      icon: '🧠'
    },
    {
      author: 'Medical Education Study',
      role: 'Journal of Medical Education',
      text: 'Students using spaced repetition for anatomy learning achieved 88% average test scores vs 78% for traditional methods.',
      icon: '📊'
    },
    {
      author: 'USC Neuroscience Research',
      role: 'University of Southern California',
      text: 'Spaced repetition enhances brain connections by repeatedly firing neural pathways together over time, maximizing memory consolidation.',
      icon: '🔬'
    }
  ]
} as const;