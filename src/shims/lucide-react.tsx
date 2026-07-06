import type { SVGProps, ReactElement } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export type LucideIcon = ((props: IconProps) => ReactElement) & { displayName?: string };

function makeIcon(displayName: string) {
  const Icon: LucideIcon = (props: IconProps) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
  Icon.displayName = displayName;
  return Icon;
}

// Commonly used icons in this codebase (placeholder SVGs).
export const Plus = makeIcon('Plus');
export const Search = makeIcon('Search');
export const Trash2 = makeIcon('Trash2');
export const ArrowLeft = makeIcon('ArrowLeft');
export const ArrowRight = makeIcon('ArrowRight');
export const Building2 = makeIcon('Building2');
export const FileText = makeIcon('FileText');
export const FileSpreadsheet = makeIcon('FileSpreadsheet');
export const FileDown = makeIcon('FileDown');
export const Loader2 = makeIcon('Loader2');
export const Package = makeIcon('Package');
export const X = makeIcon('X');
export const Check = makeIcon('Check');
export const ChevronDown = makeIcon('ChevronDown');
export const ChevronLeft = makeIcon('ChevronLeft');
export const Settings = makeIcon('Settings');
export const Menu = makeIcon('Menu');
export const Layers = makeIcon('Layers');
export const ChevronRight = makeIcon('ChevronRight');
export const Info = makeIcon('Info');
export const AlertTriangle = makeIcon('AlertTriangle');
export const XCircle = makeIcon('XCircle');
export const CheckCircle = makeIcon('CheckCircle');
export const RefreshCw = makeIcon('RefreshCw');
export const ArrowLeftRight = makeIcon('ArrowLeftRight');
export const ArrowRightLeft = ArrowLeftRight;

// Sidebar + UI kit icons
export const BookOpen = makeIcon('BookOpen');
export const Wallet = makeIcon('Wallet');
export const Coins = makeIcon('Coins');
export const ClipboardList = makeIcon('ClipboardList');
export const ClipboardMinus = makeIcon('ClipboardMinus');
export const Users = makeIcon('Users');
export const Scale = makeIcon('Scale');
export const TrendingUp = makeIcon('TrendingUp');
export const TrendingDown = makeIcon('TrendingDown');
export const BarChart3 = makeIcon('BarChart3');
export const Receipt = makeIcon('Receipt');
export const Briefcase = makeIcon('Briefcase');
export const Landmark = makeIcon('Landmark');
export const ScrollText = makeIcon('ScrollText');
export const Home = makeIcon('Home');
export const PiggyBank = makeIcon('PiggyBank');
export const FileQuestion = makeIcon('FileQuestion');
export const ClipboardCheck = makeIcon('ClipboardCheck');
export const Building = makeIcon('Building');
export const Banknote = makeIcon('Banknote');
export const Calculator = makeIcon('Calculator');
export const IndianRupee = makeIcon('IndianRupee');
export const Clock = makeIcon('Clock');
export const ShieldCheck = makeIcon('ShieldCheck');
export const Globe = makeIcon('Globe');
export const Percent = makeIcon('Percent');
export const FileCheck = makeIcon('FileCheck');
export const FileSignature = makeIcon('FileSignature');
export const PieChart = makeIcon('PieChart');
export const Link2 = makeIcon('Link2');
export const CheckSquare = makeIcon('CheckSquare');
export const Pencil = makeIcon('Pencil');
export const Circle = makeIcon('Circle');
export const ChevronUp = makeIcon('ChevronUp');
export const Sparkles = makeIcon('Sparkles');
export const Download = makeIcon('Download');
export const ExternalLink = makeIcon('ExternalLink');
export const Shield = makeIcon('Shield');

// lucide-react also exports many components with an `Icon` suffix in shadcn templates.
export const XIcon = X;
export const CheckIcon = Check;
export const SearchIcon = Search;
export const CircleIcon = Circle;
export const ChevronDownIcon = ChevronDown;
export const ChevronUpIcon = ChevronUp;
export const ChevronRightIcon = ChevronRight;

