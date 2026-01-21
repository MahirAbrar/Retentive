export const GAMIFICATION_CONFIG = {
  // ========== SPACED REPETITION INTERVALS ==========
  LEARNING_MODES: {
    ultracram: {
      name: "Ultra-Cram Mode",
      description: "Night before exam, urgent deadlines",

      // Exact intervals in hours
      intervals: [
        0.00833,  // Review 1: 30 seconds (~0.00833 hours)
        2,        // Review 2: 2 hours
        24,       // Review 3: 1 day
        72,       // Review 4: 3 days
        168,      // Review 5: 7 days (mastered)
      ],

      // Review windows (hours before/after due time)
      windowBefore: 0,      // Can't review early in ultra-cram mode
      windowAfter: 1,       // 1 hour grace period

      // Points for reviewing in different windows
      pointsMultiplier: {
        onTime: 2.5,        // Within 15 min of due time
        inWindow: 1.8,      // Within the window
        late: 0.7,          // Outside window
      }
    },
    
    cram: {
      name: "Cram Mode",
      description: "Important presentations, job interviews",

      // Exact intervals in hours
      intervals: [
        2,       // Review 1: 2 hours
        24,      // Review 2: 1 day
        72,      // Review 3: 3 days
        168,     // Review 4: 7 days
        336,     // Review 5: 14 days (mastered)
      ],

      // Review windows (hours before/after due time)
      windowBefore: 2,      // Can review 2 hours early
      windowAfter: 4,       // 4 hour grace period

      // Points for reviewing in different windows
      pointsMultiplier: {
        onTime: 2.0,        // Within 2 hours of due time
        inWindow: 1.5,      // Within the window
        late: 0.8,          // Outside window
      }
    },
    
    steady: {
      name: "Steady Mode",
      description: "Regular coursework, professional development",

      // Exact intervals in hours
      intervals: [
        24,      // Review 1: 1 day
        72,      // Review 2: 3 days
        168,     // Review 3: 7 days (1 week)
        336,     // Review 4: 14 days (2 weeks)
        720,     // Review 5: 30 days (~1 month) (mastered)
      ],

      // Review windows
      windowBefore: 12,     // Can review 12 hours early
      windowAfter: 24,      // 24 hour grace period

      // Points for reviewing in different windows
      pointsMultiplier: {
        onTime: 2.0,        // Within 2 hours of due time
        inWindow: 1.2,      // Within the window
        late: 0.7,          // Outside window
      }
    },

    extended: {
      name: "Extended Mode",
      description: "Background knowledge, general interest",

      // Exact intervals in hours
      intervals: [
        72,      // Review 1: 3 days
        168,     // Review 2: 7 days (1 week)
        336,     // Review 3: 14 days (2 weeks)
        720,     // Review 4: 30 days (~1 month)
        1440,    // Review 5: 60 days (2 months) (mastered)
      ],

      // Review windows (hours before/after due time)
      windowBefore: 12,     // Can review 12 hours early
      windowAfter: 24,      // 24 hour grace period

      // Points for reviewing in different windows
      pointsMultiplier: {
        onTime: 1.8,        // Within 12 hours of due time
        inWindow: 1.4,      // Within the window
        late: 0.85,         // Outside window
      }
    },
    
    test: {
      name: "Test Mode",
      description: "Quick 30-second intervals for testing mastery system",
      
      // Exact intervals in hours (30 seconds = 0.00833 hours)
      intervals: [
        0.00833,  // Review 1: 30 seconds
        0.00833,  // Review 2: 30 seconds
        0.00833,  // Review 3: 30 seconds
        0.00833,  // Review 4: 30 seconds
        0.00833,  // Review 5: 30 seconds (mastered)
      ],
      
      // Review windows
      windowBefore: 0,      // Can't review early in test mode
      windowAfter: 0.00833, // 30 second grace period
      
      // Points for reviewing in different windows
      pointsMultiplier: {
        onTime: 3.0,        // Within 10 seconds of due time
        inWindow: 2.0,      // Within the window
        late: 1.0,          // Outside window
      }
    },
    
    // Easy to add more modes later:
    // intense: {
    //   name: "Intense Mode",
    //   intervals: [0.08, 0.25, 1, 4, 12, 24, 48],
    //   ...
    // }
  },
  
  // ========== MASTERY SETTINGS ==========
  MASTERY: {
    reviewsRequired: 5,  // Complete 5 reviews to master (covers all modes)
    bonusPoints: 100,    // Points for mastering an item
    
    // Visual indicators at different stages
    stages: {
      1: { emoji: "•", label: "New" },
      2: { emoji: "••", label: "Growing" },
      3: { emoji: "•••", label: "Strong" },
      4: { emoji: "••••", label: "Mature" },
      5: { emoji: "•••••", label: "Mastered" }
    }
  },
  
  // ========== POINTS SYSTEM ==========
  POINTS: {
    baseReview: 10,      // Base points for any review

    // Streak bonuses (fixed amounts)
    streakMilestones: {
      3: 50,
      7: 150,
      14: 300,
      30: 700,
      60: 1500,
      100: 3000,
      365: 10000
    },
    
    // Session combo (reviewing multiple items)
    comboBonus: {
      5: 25,     // 5 reviews = +25 points
      10: 75,    // 10 reviews = +75 points
      25: 200,   // 25 reviews = +200 points
      50: 500,   // 50 reviews = +500 points
    }
  },
  
  // ========== GAMIFICATION FEATURES ==========
  FEATURES: {
    // Levels
    levels: {
      experienceBase: 100,      // Level 1 = 100 XP
      experienceGrowth: 1.2,    // Each level needs 20% more
    },
    
    // Daily goals
    dailyGoals: {
      reviews: 20,             // Review 20 items daily
      bonusPoints: 50,         // Bonus for completing goal
    },
    
    // Time pressure bonuses
    timePressure: {
      perfectWindow: 0.5,      // Within 30 min = "perfect"
      goodWindow: 2,           // Within 2 hours = "good"
    }
  },
  
  // ========== ACHIEVEMENTS ==========
  ACHIEVEMENTS: {
    // Reviews (6)
    FIRST_REVIEW: {
      id: 'first_review',
      name: 'First Steps',
      description: 'Complete your first review',
      icon: '🎯',
      points: 10,
      category: 'reviews'
    },
    REVIEWS_10: {
      id: 'reviews_10',
      name: 'Getting Started',
      description: 'Complete 10 reviews',
      icon: '📚',
      points: 25,
      category: 'reviews'
    },
    REVIEWS_50: {
      id: 'reviews_50',
      name: 'Dedicated Learner',
      description: 'Complete 50 reviews',
      icon: '📖',
      points: 50,
      category: 'reviews'
    },
    REVIEWS_100: {
      id: 'reviews_100',
      name: 'Century',
      description: 'Complete 100 reviews',
      icon: '💯',
      points: 100,
      category: 'reviews'
    },
    REVIEWS_500: {
      id: 'reviews_500',
      name: 'Knowledge Seeker',
      description: 'Complete 500 reviews',
      icon: '🔍',
      points: 250,
      category: 'reviews'
    },
    REVIEWS_1000: {
      id: 'reviews_1000',
      name: 'Master Scholar',
      description: 'Complete 1000 reviews',
      icon: '🎓',
      points: 500,
      category: 'reviews'
    },

    // Streaks (5)
    STREAK_3: {
      id: 'streak_3',
      name: "Three's Company",
      description: 'Maintain a 3-day streak',
      icon: '🔥',
      points: 25,
      category: 'streaks'
    },
    STREAK_7: {
      id: 'streak_7',
      name: 'Week Warrior',
      description: 'Maintain a 7-day streak',
      icon: '🔥',
      points: 50,
      category: 'streaks'
    },
    STREAK_14: {
      id: 'streak_14',
      name: 'Fortnight Fighter',
      description: 'Maintain a 14-day streak',
      icon: '🔥',
      points: 100,
      category: 'streaks'
    },
    STREAK_30: {
      id: 'streak_30',
      name: 'Monthly Master',
      description: 'Maintain a 30-day streak',
      icon: '🔥🔥',
      points: 200,
      category: 'streaks'
    },
    STREAK_100: {
      id: 'streak_100',
      name: 'Unstoppable',
      description: 'Maintain a 100-day streak',
      icon: '🔥🔥🔥',
      points: 500,
      category: 'streaks'
    },

    // Mastery (4)
    FIRST_MASTERY: {
      id: 'first_mastery',
      name: 'First Mastery',
      description: 'Master your first item',
      icon: '⭐',
      points: 25,
      category: 'mastery'
    },
    MASTERY_10: {
      id: 'mastery_10',
      name: 'Knowledge Base',
      description: 'Master 10 items',
      icon: '⭐⭐',
      points: 75,
      category: 'mastery'
    },
    MASTERY_50: {
      id: 'mastery_50',
      name: 'Expert',
      description: 'Master 50 items',
      icon: '🌟',
      points: 200,
      category: 'mastery'
    },
    MASTERY_100: {
      id: 'mastery_100',
      name: 'Centurion',
      description: 'Master 100 items',
      icon: '💫',
      points: 400,
      category: 'mastery'
    },

    // Focus (4)
    FIRST_FOCUS: {
      id: 'first_focus',
      name: 'Focused',
      description: 'Complete your first focus session',
      icon: '🎯',
      points: 10,
      category: 'focus'
    },
    FOCUS_1_HOUR: {
      id: 'focus_1_hour',
      name: 'Hour of Power',
      description: 'Complete 1 hour of focused work',
      icon: '⏱️',
      points: 50,
      category: 'focus'
    },
    FOCUS_10_HOURS: {
      id: 'focus_10_hours',
      name: 'Deep Worker',
      description: 'Complete 10 hours of focused work',
      icon: '🧠',
      points: 150,
      category: 'focus'
    },
    PERFECT_ADHERENCE: {
      id: 'perfect_adherence',
      name: 'Laser Focus',
      description: 'Complete a session with 100% adherence',
      icon: '🎯',
      points: 50,
      category: 'focus'
    },

    // Milestones (5)
    LEVEL_5: {
      id: 'level_5',
      name: 'Rising Star',
      description: 'Reach level 5',
      icon: '🎖️',
      points: 50,
      category: 'milestones'
    },
    LEVEL_10: {
      id: 'level_10',
      name: 'Veteran',
      description: 'Reach level 10',
      icon: '🏅',
      points: 100,
      category: 'milestones'
    },
    LEVEL_20: {
      id: 'level_20',
      name: 'Legend',
      description: 'Reach level 20',
      icon: '🏆',
      points: 250,
      category: 'milestones'
    },
    POINTS_1000: {
      id: 'points_1000',
      name: 'Point Collector',
      description: 'Earn 1000 total points',
      icon: '💰',
      points: 50,
      category: 'milestones'
    },
    POINTS_10000: {
      id: 'points_10000',
      name: 'Point Master',
      description: 'Earn 10000 total points',
      icon: '💎',
      points: 200,
      category: 'milestones'
    }
  },
  
  // ========== VISUAL SETTINGS ==========
  VISUALS: {
    // Animations
    showPointsPopup: true,
    pointsPopupDuration: 2000,
    
    // Effects
    perfectTimingParticles: true,
    streakFireAnimation: true,
    comboLightning: true,
    
    // Colors
    colors: {
      points: "#4CAF50",
      streak: "#FF6B6B",
      perfect: "#FFD700",
      combo: "#9C27B0"
    }
  },
  
  // ========== MOTIVATIONAL MESSAGES ==========
  MESSAGES: {
    reviewComplete: [
      "Great job!",
      "Keep it up!",
      "Excellent!",
      "You're on fire!"
    ],
    
    perfectTiming: [
      "Perfect timing!",
      "Right on schedule!",
      "Precision!"
    ],
    
    streakContinue: [
      "day streak! Don't stop now!",
      "days in a row! Amazing!",
      "day streak! You're unstoppable!"
    ]
  }
} as const

// Type exports for TypeScript
export type LearningModeConfig = typeof GAMIFICATION_CONFIG.LEARNING_MODES[keyof typeof GAMIFICATION_CONFIG.LEARNING_MODES]