/* ═══════════════════════════════════════════════════════
   Icon Barrel – ItsHover (animated) replaces Lucide.
   Names match original Lucide names so JSX needs zero
   changes — only the import path is updated.
   ═══════════════════════════════════════════════════════ */

// ── ItsHover icons re-exported under their Lucide names ──
export { default as ArrowLeft } from "./arrow-back";
export { default as ArrowRight } from "./arrow-narrow-right";
export { default as ArrowUpRight } from "./arrow-narrow-up";
export { default as BellOff } from "./bell-off";
export { default as Book } from "./book";
export { default as Bookmark } from "./bookmark";
export { default as Camera } from "./camera";
export { default as Check } from "./checked";
export { default as Clock } from "./clock";
export { default as Code } from "./code";
export { default as Coffee } from "./coffee";
export { default as Copy } from "./copy";
export { default as CreditCard } from "./credit-card";
export { default as DollarSign } from "./wallet";
export { default as Download } from "./download";
export { default as Edit } from "./pen";
export { default as Expand } from "./expand"; // Maximize2
export { default as ExternalLink } from "./external-link";
export { default as Eye } from "./eye";
export { default as EyeOff } from "./eye-off";
export { default as File } from "./file-description";
export { default as Filter } from "./filter";
export { default as Flame } from "./flame";
export { default as Globe } from "./globe";
export { default as Heart } from "./heart";
export { default as History } from "./history-circle";
export { default as Home } from "./home";
export { default as Info } from "./info-circle";
export { default as Layers } from "./layers";
export { default as Link } from "./link";
export { default as List } from "./unordered-list";
export { default as Lock } from "./lock";
export { default as LogOut } from "./logout";
export { default as MapPin } from "./map-pin";
export { default as Maximize2 } from "./expand";
export { default as MessageCircle } from "./message-circle";
export { default as Moon } from "./moon";
export { default as MoreHorizontal } from "./dots-horizontal";
export { default as Package } from "./stack-3";
export { default as MoreVertical } from "./dots-vertical";
export { default as RefreshCw } from "./refresh";
export { default as Rocket } from "./rocket";
export { default as Save } from "./save";
export { default as Search } from "./magnifier";
export { default as Send } from "./send";
export { default as Settings } from "./gear";
export { default as Shield } from "./shield-check";
export { default as ShoppingCart } from "./shopping-cart";
export { default as Sparkles } from "./sparkles";
export { default as Star } from "./star";
export { default as Target } from "./target";
export { default as TrendingDown } from "./arrow-narrow-down";
export { default as TrendingUp } from "./arrow-narrow-up";
export { default as Terminal } from "./terminal";
export { default as Trash2 } from "./trash";
export { default as Truck } from "./truck-electric";
export { default as Upload } from "./upload";
export { default as User } from "./user";
export { default as UserCheck } from "./user-check";
export { default as UserPlus } from "./user-plus";
export { default as Users } from "./users";
export { default as UsersGroup } from "./users-group";
export { default as Wallet } from "./wallet";
export { default as World } from "./world";
export { default as X } from "./x";
export { default as AlertTriangle } from "./triangle-alert";
export { default as BarChart3 } from "./chart-bar";
export { default as ChartLine } from "./chart-line";
export { default as ChevronRight } from "./right-chevron";
export { default as ChevronDown } from "./down-chevron";
export { default as CheckCircle } from "./double-check";
export { default as LayoutDashboard } from "./layout-dashboard";
export { default as PieChart } from "./chart-pie";
export { default as SendHorizontal } from "./send";

// ── Lucide fallback (no ItsHover equivalent yet) ──
export {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ArrowLeftRight,
  Award,
  Building2,
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronUp,
  ClipboardList,
  Columns,
  Database,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  Flag,
  Gift,
  GitBranch,
  GitMerge,
  LayoutGrid,
  Loader2,
  Map,
  Menu,
  Minimize2,
  Minus,
  Monitor,
  PackageCheck,
  PackagePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Percent,
  Plus,
  PlusCircle,
  Printer,
  Receipt,
  RotateCw,
  Ruler,
  Server,
  ShoppingBag,
  Sidebar,
  Sliders,
  Sun,
  Tag,
  Tags,
  Ticket,
  Undo2,
  UserCog,
  Warehouse,
  UserMinus,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

export type LucideIcon = React.ComponentType<any>;

export type AnimatedIconHandle = import("./types").AnimatedIconHandle;
export type AnimatedIconProps = import("./types").AnimatedIconProps;
