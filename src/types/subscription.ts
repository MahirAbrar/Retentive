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
    price: 5.00,
    currency: 'USD',
    interval: 'month' as const,
    name: 'Monthly',
    description: 'Billed monthly',
    features: [
      'Unlimited topics & items',
      'Advanced statistics',
      'Offline mode',
      'Export your data',
      'Cancel anytime'
    ]
  },
  quarterly: {
    price: 12.00,
    currency: 'USD',
    interval: '3 months' as const,
    name: 'Quarterly',
    description: '20% off',
    savings: 3.00,
    pricePerMonth: 4.00,
    badge: 'Most Popular',
    features: [
      'Save 20% ($4/month)',
      'Unlimited topics & items',
      'Advanced statistics',
      'Offline mode',
      'Export your data'
    ]
  },
  semiAnnual: {
    price: 15.00,
    currency: 'USD',
    interval: '6 months' as const,
    name: 'Semi-Annual',
    description: '50% off',
    savings: 15.00,
    pricePerMonth: 2.50,
    badge: 'Best Value',
    features: [
      'Best value - 50% off ($2.50/month)',
      'Unlimited topics & items',
      'Advanced statistics',
      'Offline mode',
      'Export your data'
    ]
  },
  trial: {
    days: 14,
    name: 'Free Trial',
    description: '14 days of full access',
    features: [
      'Full access to all features',
      'Unlimited topics & items',
      'Advanced statistics',
      'Offline mode',
      'Export your data'
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
  retentionImprovement: 200,
  betterRetention: 93,
  statistics: [
    { iconName: 'TrendingUp', value: '93%', label: 'Better Retention' },
    { iconName: 'Brain', value: '200%', label: 'Retention Increase' },
    { iconName: 'Microscope', value: '140+ Years', label: 'Of Research' }
  ],
  howItWorks: [
    {
      step: 1,
      title: 'Create Topics',
      description: 'Organize your knowledge into main subjects that you want to master.',
      iconName: 'BookOpen'
    },
    {
      step: 2,
      title: 'Add Items',
      description: 'Break down complex topics into bite-sized, manageable items.',
      iconName: 'FileText'
    },
    {
      step: 3,
      title: 'Study Your Items',
      description: 'Review your original content and materials at the perfect moments for maximum retention.',
      iconName: 'Target'
    },
    {
      step: 4,
      title: 'Review at Optimal Times',
      description: 'Our algorithm tells you exactly when to review for maximum retention.',
      iconName: 'Clock'
    },
    {
      step: 5,
      title: 'Ace Everything!',
      description: 'Ace your exams! Ace your work! Ace your studies! Become unstoppable.',
      iconName: 'Trophy'
    }
  ],
  learningModes: [
    {
      name: 'Ultra-Cram',
      intervals: '30s → 2h → 1d → 3d...',
      wordCount: '50-75 words',
      bestFor: 'Night before exam, urgent deadlines',
      iconName: 'Zap'
    },
    {
      name: 'Cram',
      intervals: '2h → 1d → 3d → 7d...',
      wordCount: '50-75 words',
      bestFor: 'Important presentations, job interviews',
      iconName: 'Flame'
    },
    {
      name: 'Steady',
      intervals: '1d → 3d → 7d → 14d...',
      wordCount: '75-125 words',
      bestFor: 'Regular coursework, professional development',
      iconName: 'BarChart'
    },
    {
      name: 'Extended',
      intervals: '3d → 7d → 14d → 30d...',
      wordCount: '100-150 words',
      bestFor: 'Background knowledge, general interest',
      iconName: 'Sprout'
    }
  ],
  research: [
    {
      author: 'Hermann Ebbinghaus (1880s)',
      role: 'Pioneer of Memory Research',
      text: 'Created the "forgetting curve" showing that spaced review intervals dramatically improve long-term retention compared to massed practice.',
      iconName: 'Brain'
    },
    {
      author: 'Medical Education Study',
      role: 'Journal of Medical Education',
      text: 'Students using spaced repetition for anatomy learning achieved 88% average test scores vs 78% for traditional methods.',
      iconName: 'BarChart'
    },
    {
      author: 'USC Neuroscience Research',
      role: 'University of Southern California',
      text: 'Spaced repetition enhances brain connections by repeatedly firing neural pathways together over time, maximizing memory consolidation.',
      iconName: 'Microscope'
    }
  ],
  timeTracking: {
    title: 'Built-in Time Tracking & Adherence',
    subtitle: 'Stay accountable and build learning habits that stick',
    description: 'Track your study time automatically and build the habits that transform casual learners into knowledge masters.',
    benefits: [
      {
        iconName: 'Timer',
        title: 'Automatic Time Tracking',
        description: 'Every study session is tracked automatically. See exactly how much time you spend mastering each topic.',
        stat: 'Real-time tracking'
      },
      {
        iconName: 'Target',
        title: 'Accountability That Works',
        description: 'Research shows self-monitoring increases adherence by over 100%. Visual feedback keeps you committed to your learning goals.',
        stat: '100%+ adherence boost'
      },
      {
        iconName: 'TrendingUp',
        title: 'Build Study Habits',
        description: 'Students who track study appointments with accountability mechanisms show significantly better exam performance and habit formation.',
        stat: 'Better performance'
      },
      {
        iconName: 'BarChart3',
        title: 'See Your Progress',
        description: 'Visualize your learning journey with detailed analytics. Time invested, topics mastered, and retention rates all in one place.',
        stat: 'Complete insights'
      }
    ],
    researchNote: 'Studies show that early and frequent self-monitoring predicts success. Time tracking creates accountability through visual feedback and progress monitoring.'
  }
} as const;