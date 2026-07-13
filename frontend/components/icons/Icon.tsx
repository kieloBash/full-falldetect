import {
  AlertTriangle,
  Bell,
  Bookmark,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  LayoutGrid,
  Lock,
  Maximize2,
  Monitor,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Video,
  Volume2,
  VolumeX,
  WifiOff,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";

/**
 * Semantic name -> lucide-react component. Callers use `<Icon name="check" />`
 * instead of importing individual lucide icons directly, so the icon set can
 * be swapped or restyled from one place without touching every component.
 */
const ICONS = {
  shield: ShieldCheck,
  grid: LayoutGrid,
  wall: Monitor,
  search: Search,
  check: Check,
  x: X,
  alert: AlertTriangle,
  userCheck: UserCheck,
  checkCircle: CheckCircle2,
  xCircle: XCircle,
  wifiOff: WifiOff,
  expand: Maximize2,
  pin: Bookmark,
  reconnect: RefreshCw,
  assign: UserPlus,
  bell: Bell,
  volume: Volume2,
  volumeOff: VolumeX,
  play: Play,
  camera: Video,
  lock: Lock,
  eye: Eye,
  eyeOff: EyeOff,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  fill?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 16, className, fill = "none", strokeWidth = 2 }: IconProps) {
  const LucideIcon = ICONS[name];
  return <LucideIcon size={size} fill={fill} strokeWidth={strokeWidth} className={`shrink-0 ${className ?? ""}`} aria-hidden="true" />;
}
