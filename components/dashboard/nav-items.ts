import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  LayoutDashboard,
  List,
  MapPinned,
  Workflow,
} from "lucide-react";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/sentiment-map",
    label: "Sentiment Map",
    icon: MapPinned,
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: BarChart3,
  },
  {
    href: "/posts-feed",
    label: "Posts Feed",
    icon: List,
  },
  {
    href: "/pipeline",
    label: "Pipeline",
    icon: Workflow,
  },
];
