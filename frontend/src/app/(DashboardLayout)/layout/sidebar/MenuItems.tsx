import dynamic from "next/dynamic";
import { uniqueId } from "lodash";
import { ComponentType } from "react";
import { TablerIconsProps } from "@tabler/icons-react";

// Type definitions
export type NavLinkItem = {
  id: string;
  title: string;
  icon: ComponentType<TablerIconsProps>;
  href: string;
  priority?: boolean;
  disabled?: boolean;
  external?: boolean;
};

export type NavLabelItem = {
  navlabel: true;
  subheader: string;
};

export type MenuItem = NavLinkItem | NavLabelItem;

type MenuCategory = {
  name: string;
  icon: ComponentType<TablerIconsProps>;
  items: NavLinkItem[];
  paths: string[];
};

// Dynamically import icons
const IconLayoutDashboard = dynamic(() => import('@tabler/icons-react').then(mod => mod.IconLayoutDashboard), { 
  loading: () => <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />,
  ssr: false
});
const IconTypography = dynamic(() => import('@tabler/icons-react').then(mod => mod.IconTypography), { ssr: false });
const IconSortDescending2 = dynamic(() => import('@tabler/icons-react').then(mod => mod.IconSortDescending2), { ssr: false });
const IconFileInvoice = dynamic(() => import('@tabler/icons-react').then(mod => mod.IconFileInvoice), { ssr: false });
const IconCopy = dynamic(() => import('@tabler/icons-react').then(mod => mod.IconCopy), { ssr: false });
const IconUsersGroup = dynamic(() => import('@tabler/icons-react').then(mod => mod.IconUsersGroup), { ssr: false });
const IconUserCog = dynamic(() => import('@tabler/icons-react').then(mod => mod.IconUserCog), { ssr: false });
const IconLogin = dynamic(() => import('@tabler/icons-react').then(mod => mod.IconLogin), { ssr: false });
const IconUserPlus = dynamic(() => import('@tabler/icons-react').then(mod => mod.IconUserPlus), { ssr: false });
const IconPackage = dynamic(() => import('@tabler/icons-react').then(mod => mod.IconPackage), { ssr: false });
const IconWallet = dynamic(() => import('@tabler/icons-react').then(mod => mod.IconWallet), { ssr: false });
const IconLock = dynamic(() => import('@tabler/icons-react').then(mod => mod.IconLock), { ssr: false });

const menuCategories: MenuCategory[] = [
  {
    name: "Main",
    icon: IconLayoutDashboard,
    items: [
      {
        id: uniqueId(),
        title: "Dashboard",
        icon: IconLayoutDashboard,
        href: "/",
        priority: true,
        disabled: false,
        external: false,
      }
    ],
    paths: ["/", "/dashboard"]
  },
  {
    name: "Inventory",
    icon: IconPackage,
    items: [
      {
        id: uniqueId(),
        title: "Gate In",
        icon: IconTypography,
        href: "/utilities/gatein",
        disabled: false,
        external: false,
      },
      {
        id: uniqueId(),
        title: "Gate Out",
        icon: IconSortDescending2,
        href: "/utilities/gateout",
        disabled: false,
        external: false,
      },
      {
        id: uniqueId(),
        title: "Invoices",
        icon: IconFileInvoice,
        href: "/utilities/invoices",
        priority: true,
        disabled: false,
        external: false,
      }
    ],
    paths: ["/utilities/gatein", "/utilities/gateout", "/utilities/invoices"]
  },
  {
    name: "Products",
    icon: IconCopy,
    items: [
      {
        id: uniqueId(),
        title: "Products List",
        icon: IconCopy,
        href: "/utilities/ProductList",
        disabled: false,
        external: false,
      }
    ],
    paths: ["/utilities/ProductList"]
  },
  {
    name: "Customer",
    icon: IconUsersGroup,
    items: [
      {
        id: uniqueId(),
        title: "Customers",
        icon: IconUsersGroup,
        href: "/utilities/customer",
        priority: true,
        disabled: false,
        external: false,
      },
      {
        id: uniqueId(),
        title: "Vendors",
        icon: IconUserCog,
        href: "/utilities/vendor",
        disabled: false,
        external: false,
      }
    ],
    paths: ["/utilities/customer", "/utilities/vendor"]
  },
  {
    name: "Expense",
    icon: IconWallet,
    items: [
      {
        id: uniqueId(),
        title: "Expense",
        icon: IconUsersGroup,
        href: "/utilities/expenses",
        priority: true,
        disabled: false,
        external: false,
      },
      {
        id: uniqueId(),
        title: "HRM",
        icon: IconUsersGroup,
        href: "/utilities/HRM",
        priority: true,
        disabled: false,
        external: false,
      }
    ],
    paths: ["/utilities/expenses", "/utilities/HRM"]
  },
  {
    name: "Reports",
    icon: IconWallet,
    items: [
      {
        id: uniqueId(),
        title: "Inventory Report",
        icon: IconUsersGroup,
        href: "/utilities/inventroyreport",
        priority: true,
        disabled: false,
        external: false,
      },
      {
        id: uniqueId(),
        title: "Purchase Report",
        icon: IconUsersGroup,
        href: "/utilities/purchasereport",
        priority: true,
        disabled: false,
        external: false,
      }
    ],
    paths: ["/utilities/inventoryreport", "/utilities/purchasereport"]
  },
  {
    name: "Auth",
    icon: IconLock,
    items: [
      {
        id: uniqueId(),
        title: "Login",
        icon: IconLogin,
        href: "/authentication/login",
        disabled: false,
        external: false,
      },
      {
        id: uniqueId(),
        title: "Register",
        icon: IconUserPlus,
        href: "/authentication/register",
        disabled: false,
        external: false,
      }
    ],
    paths: ["/authentication/login", "/authentication/register"]
  }
];

const Menuitems: MenuItem[] = menuCategories.flatMap(category => [
  { navlabel: true, subheader: category.name },
  ...category.items
]);

export default Menuitems;
export { menuCategories };