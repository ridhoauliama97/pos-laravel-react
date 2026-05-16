import { readFileSync, writeFileSync } from "fs";
import path from "path";

const files = process.argv.slice(2);

const iconMap = {
  Trash2: "TrashIcon",
  Edit: "PenIcon",
  X: "XIcon",
  AlertTriangle: "TriangleAlertIcon",
  Info: "InfoCircleIcon",
  Settings: "GearIcon",
  LogOut: "LogoutIcon",
  User: "UserIcon",
  Users: "UsersIcon",
  ShoppingCart: "ShoppingCartIcon",
  Eye: "EyeIcon",
  EyeOff: "EyeOffIcon",
  Lock: "LockIcon",
  BellOff: "BellOffIcon",
  Moon: "MoonIcon",
  Upload: "UploadIcon",
  Download: "DownloadIcon",
  Filter: "FilterIcon",
  RefreshCw: "RefreshIcon",
  Copy: "CopyIcon",
  Save: "SaveIcon",
  ExternalLink: "ExternalLinkIcon",
  Clock: "ClockIcon",
  MapPin: "MapPinIcon",
  Camera: "CameraIcon",
  File: "FileDescriptionIcon",
  Wallet: "WalletIcon",
  BarChart3: "ChartBarIcon",
  PieChart: "ChartPieIcon",
  Code: "CodeIcon",
  Terminal: "TerminalIcon",
  Star: "StarIcon",
  Heart: "HeartIcon",
  Bookmark: "BookmarkIcon",
  Target: "TargetIcon",
  Link: "LinkIcon",
  MessageCircle: "MessageCircleIcon",
  UserCheck: "UserCheckIcon",
  UserPlus: "UserPlusIcon",
  Send: "SendIcon",
  Truck: "TruckElectricIcon",
  List: "UnorderedListIcon",
  Layers: "LayersIcon",
  LayoutDashboard: "LayoutDashboardIcon",
  Globe: "GlobeIcon",
  World: "WorldIcon",
  History: "HistoryCircleIcon",
  CheckCircle: "DoubleCheckIcon",
  ArrowLeft: "ArrowBackIcon",
  Maximize2: "ExpandIcon",
  MoreHorizontal: "DotsHorizontalIcon",
  MoreVertical: "DotsVerticalIcon",
  ChevronRight: "RightChevronIcon",
  ChevronDown: "DownChevronIcon",
  CreditCard: "CreditCardIcon",
  Check: "CheckedIcon",
  Home: "HomeIcon",
  Search: "MagnifierIcon",
  Shield: "ShieldCheckIcon",
};

for (const file of files) {
  let content = readFileSync(file, "utf-8");
  const original = content;

  if (!content.includes("lucide-react")) {
    console.log(`⏭  ${path.basename(file)} — no lucide-react import`);
    continue;
  }

  const dir = path.dirname(file);
  const iconsPath =
    dir.endsWith("components") || dir.includes("components\\")
      ? "./icons"
      : "../components/icons";

  // Build a set of icon names used in the import line
  const importMatch = content.match(
    /import\s+\{([^}]+)\}\s+from\s+["']lucide-react["']/,
  );
  if (!importMatch) {
    // Maybe import type
    const typeMatch = content.match(
      /import\s+type\s+\{([^}]+)\}\s+from\s+["']lucide-react["']/,
    );
    if (typeMatch) {
      const names = typeMatch[1].split(",").map((s) => s.trim());
      const newNames = names.map((n) => iconMap[n] || n);
      content = content.replace(
        /import\s+type\s+\{[^}]+\}\s+from\s+["']lucide-react["']/,
        `import type { ${newNames.join(", ")} } from "${iconsPath}"`,
      );
      console.log(`  ✅ ${path.basename(file)} — type import updated`);
    }
    continue;
  }

  const importLine = importMatch[0];
  const importBody = importMatch[1];
  const names = importBody.split(",").map((s) => s.trim());

  // Rename icons that have ItsHover equivalents
  const newNames = names.map((name) => {
    const clean = name.replace(/^type\s+/, "");
    const prefix = name.startsWith("type ") ? "type " : "";
    if (iconMap[clean]) {
      return prefix + iconMap[clean];
    }
    return name;
  });

  // Deduplicate
  const seen = new Set();
  const deduped = newNames.filter((n) => {
    const key = n.replace(/^type\s+/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const newImport = `import { ${deduped.join(", ")} } from "${iconsPath}"`;
  content = content.replace(importLine, newImport);

  // Also handle standalone `import type { LucideIcon }` etc.
  const typeImportRegex = /import\s+type\s+\{([^}]+)\}\s+from\s+["']lucide-react["']/;
  const typeMatch = content.match(typeImportRegex);
  if (typeMatch) {
    const typeNames = typeMatch[1].split(",").map((s) => s.trim());
    const newTypeNames = typeNames.map((n) => iconMap[n] || n);
    content = content.replace(
      typeImportRegex,
      `import type { ${newTypeNames.join(", ")} } from "${iconsPath}"`,
    );
  }

  if (content !== original) {
    writeFileSync(file, content, "utf-8");
    console.log(`  ✅ ${path.basename(file)} — updated`);
  }
}
