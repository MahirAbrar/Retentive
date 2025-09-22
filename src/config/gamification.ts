export const GAMIFICATION_CONFIG = {
  // ========== SPACED REPETITION INTERVALS ==========
  LEARNING_MODES: {
    ultracram: {
      name: "Ultra-Cram Mode",
      description: "Test in 24-48 hours - maximum short-term retention",
      
      // Exact intervals in hours
      intervals: [
        0.5,     // Review 1: 30 minutes
        2,       // Review 2: 2 hours
        9,       // Review 3: 9 hours (before bed)
        20,      // Review 4: Next morning (~20 hours)
        4,       // Review 5: 4 hours before test (mastered)
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
      name: "Standard Cram Mode",
      description: "Test in 3-7 days - balanced short-term retention",
      
      // Exact intervals in hours
      intervals: [
        0.5,     // Review 1: 30 minutes
        3,       // Review 2: 3 hours
        24,      // Review 3: 1 day
        48,      // Review 4: 2 days
        96,      // Review 5: 4 days (mastered)
      ],
      
      // Review windows (hours before/after due time)
      windowBefore: 0,      // Can't review early in cram mode
      windowAfter: 2,       // 2 hour grace period
      
      // Points for reviewing in different windows
      pointsMultiplier: {
        onTime: 2.0,        // Within 30 min of due time
        inWindow: 1.5,      // Within the window
        late: 0.8,          // Outside window
      }
    },
    
    extended: {
      name: "Extended Cram Mode",
      description: "Test in 2 weeks - longer-lasting retention",
      
      // Exact intervals in hours
      intervals: [
        1,       // Review 1: 1 hour
        5,       // Review 2: 5 hours
        24,      // Review 3: 1 day
        72,      // Review 4: 3 days
        168,     // Review 5: 7 days
        240,     // Review 6: 10 days (mastered)
      ],
      
      // Review windows (hours before/after due time)
      windowBefore: 1,      // Can review 1 hour early
      windowAfter: 4,       // 4 hour grace period
      
      // Points for reviewing in different windows
      pointsMultiplier: {
        onTime: 1.8,        // Within 1 hour of due time
        inWindow: 1.4,      // Within the window
        late: 0.85,         // Outside window
      }
    },
    
    steady: {
      name: "Steady Mode", 
      description: "Long-term retention with spaced intervals",
      
      // Exact intervals in hours
      intervals: [
        24,      // Review 1: 1 day
        72,      // Review 2: 3 days
        168,     // Review 3: 7 days (1 week)
        384,     // Review 4: 16 days (~2.3 weeks)
        840,     // Review 5: 35 days (~5 weeks) (mastered)
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
    
    // Priority bonuses (simple multiplier)
    priorityBonus: {
      1: 0.5,   // Low priority
      2: 0.75,
      3: 1.0,   // Normal
      4: 1.25,
      5: 1.5,   // High priority
    },
    
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
    FIRST_REVIEW: {
      id: 'first_review',
      name: 'First Steps',
      description: 'Complete your first review',
      icon: '🎯',
      points: 50
    },
    FIRST_MASTERY: {
      id: 'first_mastery',
      name: 'Mastery',
      description: 'Master your first item',
      icon: '⭐',
      points: 100
    },
    STREAK_7: {
      id: 'streak_7',
      name: 'Week Warrior',
      description: 'Maintain a 7-day streak',
      icon: '🔥',
      points: 200
    },
    STREAK_30: {
      id: 'streak_30',
      name: 'Consistent',
      description: 'Maintain a 30-day streak',
      icon: '🔥🔥',
      points: 500
    },
    PERFECT_10: {
      id: 'perfect_10',
      name: 'Perfectionist',
      description: 'Get perfect timing 10 times',
      icon: '🎯',
      points: 300
    },
    SPEED_DEMON: {
      id: 'speed_demon',
      name: 'Speed Demon',
      description: 'Review 50 items in one session',
      icon: '⚡',
      points: 400
    },
    POINTS_100: {
      id: 'points_100',
      name: 'Century',
      description: 'Earn 100 points',
      icon: '💯',
      points: 50
    },
    POINTS_1000: {
      id: 'points_1000',
      name: 'Millionaire',
      description: 'Earn 1000 points',
      icon: '💰',
      points: 200
    },
    LEVEL_5: {
      id: 'level_5',
      name: 'Level 5',
      description: 'Reach level 5',
      icon: '🎖️',
      points: 100
    },
    LEVEL_10: {
      id: 'level_10',
      name: 'Level 10',
      description: 'Reach level 10',
      icon: '🏆',
      points: 1000
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