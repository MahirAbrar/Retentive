/**
 * Break Activities Config
 * Defines activities for different break categories during focus sessions
 */

import type { BreakActivity, BreakCategory } from '../types/focus'

export type { BreakActivity, BreakCategory }

export const BREAK_CATEGORIES: BreakCategory[] = [
  {
    id: 'cognitive-overload',
    title: 'Need to Absorb Info?',
    emoji: '📚',
    description: 'Activities to help process and consolidate what you\'ve learned',
    activities: [
      {
        id: 'nature-reset',
        name: 'Nature Reset',
        emoji: '🌿',
        durationMinutes: 0.67, // 40 seconds
        description: 'Look at nature or go outside for a quick mental reset',
      },
      {
        id: 'tension-release',
        name: 'Tension Release',
        emoji: '💪',
        durationMinutes: 2,
        description: 'Release physical tension through stretching',
      },
      {
        id: 'calm-breathing',
        name: 'Calm Breathing',
        emoji: '🫁',
        durationMinutes: 2,
        description: 'Deep breathing to calm your mind and process information',
      },
    ],
  },
  {
    id: 'attention-drift',
    title: 'Losing Focus?',
    emoji: '🎯',
    description: 'Activities to restore concentration and mental energy',
    activities: [
      {
        id: 'quick-movement',
        name: 'Quick Movement',
        emoji: '⚡',
        durationMinutes: 2,
        description: 'Fast physical movements to boost energy',
      },
      {
        id: 'green-boost',
        name: 'Green Boost',
        emoji: '🌿',
        durationMinutes: 0.67, // 40 seconds
        description: 'Look at plants or nature to refresh your mind',
      },
      {
        id: 'cold-splash',
        name: 'Cold Splash',
        emoji: '💧',
        durationMinutes: 0.5, // 30 seconds
        description: 'Splash cold water on your face to wake up',
      },
    ],
  },
  {
    id: 'urge-management',
    title: 'Want to Give Up?',
    emoji: '🚫',
    description: 'Activities to manage urges and rebuild motivation',
    activities: [
      {
        id: 'ride-the-wave',
        name: 'Ride the Wave',
        emoji: '🔥',
        durationMinutes: 2,
        description: 'Breathing + movement to ride through the urge',
      },
      {
        id: 'cold-shock',
        name: 'Cold Shock',
        emoji: '💧',
        durationMinutes: 0.5, // 30 seconds
        description: 'Cold water to reset your nervous system',
      },
      {
        id: 'power-movement',
        name: 'Power Movement',
        emoji: '💪',
        durationMinutes: 3,
        description: 'Intense physical movement to channel frustration',
      },
    ],
  },
]