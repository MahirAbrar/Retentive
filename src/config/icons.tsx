import { 
  Trophy,
  Flame,
  Star,
  Target,
  TrendingUp,
  Award,
  Zap,
  BookOpen,
  Brain,
  Medal,
  Crown,
  Sparkles,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Clock,
  Timer,
  Repeat,
  Archive,
  BarChart3,
  Activity,
  Milestone,
  GraduationCap,
  type LucideIcon
} from 'lucide-react'

// Achievement icon mappings
export const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  first_review: Target,
  mastery: Star,
  streak_7: Flame,
  streak_30: Flame, // Will use different color/size
  perfect_10: Target,
  speed_demon: Zap,
  points_100: Sparkles,
  points_1000: Trophy,
  level_5: Medal,
  level_10: Crown
}

// Status icons
export const STATUS_ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  alert: AlertCircle
} as const

// Learning mode icons  
export const MODE_ICONS = {
  cram: Timer,
  extended: Clock,
  steady: Activity,
  maintenance: Repeat,
  mastered: GraduationCap,
  archived: Archive
} as const

// Stats icons
export const STATS_ICONS = {
  streak: Flame,
  level: Star,
  points: Sparkles,
  achievements: Trophy,
  progress: TrendingUp,
  reviews: BookOpen,
  brain: Brain,
  chart: BarChart3,
  milestone: Milestone
} as const

// Helper component for rendering achievement icons
export function AchievementIcon({ 
  achievementId, 
  size = 24,
  className = ''
}: { 
  achievementId: string
  size?: number
  className?: string
}) {
  const Icon = ACHIEVEMENT_ICONS[achievementId] || Award
  return <Icon size={size} className={className} />
}