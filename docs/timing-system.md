# Timing System Documentation

## Overview

The Retentive app uses a sophisticated timing system to optimize your learning through spaced repetition. By reviewing items at the right time, you not only improve retention but also earn bonus points and achievements. This document explains how the timing system works for each learning mode.

## Core Concepts

### Review Windows

Every learning item has three key timing zones:

1. **Perfect Timing Zone** 🎯 - The optimal time to review for maximum retention and points
2. **Acceptable Window** ✅ - Good timing that still provides solid retention
3. **Late Zone** ⏰ - Outside the optimal window, reduced effectiveness

### Point Multipliers

Your timing affects the points you earn:
- **Perfect Timing**: Highest multiplier (1.8x - 3.0x depending on mode)
- **In Window**: Good multiplier (1.2x - 2.0x)
- **Late**: Reduced multiplier (0.7x - 1.0x)

## Learning Modes Breakdown

### 🔥 Ultra-Cram Mode
*For tests in 24-48 hours - Maximum short-term retention*

| Timing | Window | Points Multiplier | Example (Due at 2:00 PM) |
|--------|--------|-------------------|---------------------------|
| Perfect | ±15 minutes | 2.5x | 1:45 PM - 2:15 PM |
| In Window | Up to 1 hour after | 1.8x | 2:15 PM - 3:00 PM |
| Late | >1 hour after | 0.7x | After 3:00 PM |

**Key Points:**
- Cannot review early (must wait until due time)
- Very tight windows for maximum cramming efficiency
- Review intervals: 30 min → 2 hours → 9 hours → 20 hours → 4 hours

### 📚 Standard Cram Mode
*For tests in 3-7 days - Balanced short-term retention*

| Timing | Window | Points Multiplier | Example (Due at 2:00 PM) |
|--------|--------|-------------------|---------------------------|
| Perfect | ±30 minutes | 2.0x | 1:30 PM - 2:30 PM |
| In Window | Up to 2 hours after | 1.5x | 2:30 PM - 4:00 PM |
| Late | >2 hours after | 0.8x | After 4:00 PM |

**Key Points:**
- Cannot review early
- Slightly more flexible than Ultra-Cram
- Review intervals: 30 min → 3 hours → 1 day → 2 days → 4 days

### 📖 Extended Mode
*For tests in 2 weeks - Longer-lasting retention*

| Timing | Window | Points Multiplier | Example (Due at 2:00 PM) |
|--------|--------|-------------------|---------------------------|
| Perfect | ±1 hour | 1.8x | 1:00 PM - 3:00 PM |
| In Window | 1 hour before to 4 hours after | 1.4x | 1:00 PM - 6:00 PM |
| Late | Outside window | 0.85x | Before 1:00 PM or after 6:00 PM |

**Key Points:**
- Can review 1 hour early
- More flexible timing for busy schedules
- Review intervals: 1 hour → 5 hours → 1 day → 3 days → 7 days → 10 days

### 🌱 Steady Mode
*For long-term retention - Knowledge that lasts*

| Timing | Window | Points Multiplier | Example (Due at 2:00 PM) |
|--------|--------|-------------------|---------------------------|
| Perfect | ±2 hours | 2.0x | 12:00 PM - 4:00 PM |
| In Window | 12 hours before to 24 hours after | 1.2x | 2:00 AM - 2:00 PM next day |
| Late | Outside window | 1.0x | Outside the 36-hour window |

**Key Points:**
- Can review 12 hours early
- Very flexible for long-term learning
- Review intervals: 1 day → 3 days → 7 days → 16 days → 35 days

### 🧪 Test Mode
*For testing the mastery system - 30-second intervals*

| Timing | Window | Points Multiplier | Example (Due at 2:00:00 PM) |
|--------|--------|-------------------|---------------------------|
| Perfect | ±15 seconds | 3.0x | 1:59:45 - 2:00:15 |
| In Window | Up to 30 seconds after | 2.0x | 2:00:15 - 2:00:30 |
| Late | >30 seconds after | 1.0x | After 2:00:30 |

**Key Points:**
- Extremely short intervals for rapid testing
- All intervals are 30 seconds
- Used for debugging and testing features

## Visual Timeline Example

```
Ultra-Cram Mode (Due at 2:00 PM):
    
    1:00 PM -------- 1:45 PM -------- 2:00 PM -------- 2:15 PM -------- 3:00 PM -------- 4:00 PM
         [Cannot Review] [Perfect 2.5x]  [DUE]  [Good 1.8x]     [Late 0.7x]

Steady Mode (Due at 2:00 PM Today):
    
    2:00 AM -------- 12:00 PM -------- 2:00 PM -------- 4:00 PM -------- 2:00 PM Next Day
    [In Window 1.2x] [Perfect 2.0x]     [DUE]   [Perfect 2.0x] [In Window 1.2x]
```

## Perfect Timing Achievements

### 🏆 Achievements Related to Timing

1. **Perfect Week** - Review 10 items with perfect timing
2. **Timing Master** - Maintain 80% on-time rate for a week
3. **Consistency King** - 7-day perfect timing streak

### How Perfect Timing is Tracked

The system tracks:
- `perfect_timing_count` - Total perfect timing reviews
- Daily timing performance statistics
- Streaks of consecutive on-time reviews

## Tips for Maximizing Timing Performance

### 📱 Best Practices

1. **Enable Notifications**
   - Set reminders 15 minutes before items are due
   - Use daily summary notifications to plan your day

2. **Choose the Right Mode**
   - Ultra-Cram: When you have a test tomorrow
   - Cram: For weekly quizzes
   - Extended: For midterms (2-3 weeks out)
   - Steady: For long-term knowledge retention

3. **Plan Review Sessions**
   - Morning: Review items due overnight
   - Lunch: Quick review of morning items
   - Evening: Complete remaining reviews

4. **Understanding Flexibility**
   - Cram modes: Strict timing, review ASAP when due
   - Extended/Steady: More flexible, can batch reviews

### 📊 Timing Strategy by Mode

| Mode | Strategy | Best For |
|------|----------|----------|
| Ultra-Cram | Review immediately when due | Night-before studying |
| Cram | Review within 30 minutes | Weekly test prep |
| Extended | Review within the hour | Regular coursework |
| Steady | Review same day | Long-term learning |

## FAQ

### Q: What happens if I review early?
**A:** In Cram modes, you cannot review early - the button is disabled. In Extended/Steady modes, early reviews get the "in window" multiplier, not perfect timing.

### Q: Does reviewing late hurt my retention?
**A:** Yes, the spaced repetition algorithm is optimized for specific intervals. Late reviews may require additional reviews to achieve the same retention.

### Q: Can I change modes after starting?
**A:** Yes, but it will reset the review schedule for all items in that topic.

### Q: How do I know when perfect timing is?
**A:** Look for the golden highlight on due items - that indicates you're in the perfect timing window.

### Q: What's the best mode for medical school?
**A:** Most students use:
- Ultra-Cram for next-day quizzes
- Extended for block exams
- Steady for Step 1/board exam prep

## Technical Details

### Point Calculation Formula

```
Total Points = Base Points × Timing Multiplier × Priority Bonus × Combo Bonus

Where:
- Base Points = 10 (default)
- Timing Multiplier = Based on review timing (0.7x - 3.0x)
- Priority Bonus = 1.0x - 1.5x based on topic priority
- Combo Bonus = +5 to +50 based on consecutive reviews
```

### Database Fields

- `next_review_at`: When the item is due
- `reviewed_at`: When you actually reviewed
- `timing_bonus`: Multiplier applied
- `perfect_timing_count`: Running total of perfect reviews

## Summary

The timing system rewards consistent, well-timed reviews with:
- 🎯 More points for perfect timing
- 🏆 Special achievements
- 📈 Better retention rates
- 🎮 Gamification elements to maintain motivation

Remember: The goal isn't just to earn points, but to review at optimal times for maximum retention. The point system is designed to align game incentives with learning science!

---

*Last Updated: January 2025*
*Version: 1.0*