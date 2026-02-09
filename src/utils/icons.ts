import {
  Calculator,
  FlaskConical,
  Languages,
  Landmark,
  Laptop,
  Palette,
  Briefcase,
  HeartPulse,
  Folder,
  BookOpen,
  Music,
  Globe,
  Dumbbell,
  Code,
  Camera,
  Gamepad2,
  Utensils,
  Car,
  Plane,
  Home,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  calculator: Calculator,
  flask: FlaskConical,
  languages: Languages,
  landmark: Landmark,
  laptop: Laptop,
  palette: Palette,
  briefcase: Briefcase,
  'heart-pulse': HeartPulse,
  folder: Folder,
  'book-open': BookOpen,
  music: Music,
  globe: Globe,
  dumbbell: Dumbbell,
  code: Code,
  camera: Camera,
  gamepad: Gamepad2,
  utensils: Utensils,
  car: Car,
  plane: Plane,
  home: Home,
}

export function getIconComponent(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || Folder
}

export function getAvailableIcons(): { name: string; icon: LucideIcon }[] {
  return Object.entries(ICON_MAP).map(([name, icon]) => ({ name, icon }))
}
