import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleCheck,
  CircleHelp,
  CircleUserRound,
  CircleX,
  Clock3,
  GitBranch,
  Globe2,
  Info,
  Lock,
  Mail,
  MailOpen,
  Map,
  MapPin,
  Navigation,
  Pencil,
  Plus,
  Search,
  Send,
  UserPlus,
  Users,
  Zap,
} from "lucide-react-native";

import { C } from "../constants/theme";

const ICONS = {
  alertTriangle: AlertTriangle,
  arrowRight: ArrowRight,
  calendar: CalendarDays,
  check: Check,
  chevronDown: ChevronDown,
  circleCheck: CircleCheck,
  circleHelp: CircleHelp,
  circleUser: CircleUserRound,
  circleX: CircleX,
  clock: Clock3,
  branch: GitBranch,
  globe: Globe2,
  info: Info,
  lock: Lock,
  mail: Mail,
  mailOpen: MailOpen,
  map: Map,
  mapPin: MapPin,
  navigation: Navigation,
  pencil: Pencil,
  plus: Plus,
  search: Search,
  send: Send,
  userPlus: UserPlus,
  users: Users,
  zap: Zap,
};

export default function AppIcon({
  name,
  size = 20,
  color = C.text,
  strokeWidth = 2.2,
  ...props
}) {
  const Icon = ICONS[name] ?? CircleHelp;
  return (
    <Icon
      color={color}
      size={size}
      strokeWidth={strokeWidth}
      {...props}
    />
  );
}
