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
};

export type NavLabelItem = {
  navlabel: true;
  subheader: string;
};

export type MenuItem = NavLinkItem | NavLabelItem;

type MenuCategory = {
  name: string;
  items: NavLinkItem[];
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
const IconMoodHappy = dynamic(() => import('@tabler/icons-react').then(mod => mod.IconMoodHappy), { ssr: false });
const IconAperture = dynamic(() => import('@tabler/icons-react').then(mod => mod.IconAperture), { ssr: false });

// ✅ Define menuCategories BEFORE using it
const menuCategories: MenuCategory[] = [
  {
    name: "Main",
    items: [
      {
        id: uniqueId(),
        title: "Dashboard",
        icon: IconLayoutDashboard,
        href: "/",
        priority: true
      }
    ]
  },
  {
    name: "Inventory",
    items: [
      {
        id: uniqueId(),
        title: "Gate In",
        icon: IconTypography,
        href: "/utilities/gatein"
      },
      {
        id: uniqueId(),
        title: "Gate Out",
        icon: IconSortDescending2,
        href: "/utilities/gateout"
      },
      {
        id: uniqueId(),
        title: "Invoices",
        icon: IconFileInvoice,
        href: "/utilities/invoices",
        priority: true
      }
    ]
  },
  {
    name: "Products",
    items: [
      {
        id: uniqueId(),
        title: "Products List",
        icon: IconCopy,
        href: "/utilities/ProductList"
      }
    ]
  },
  {
    name: "Customer",
    items: [
      {
        id: uniqueId(),
        title: "Customers",
        icon: IconUsersGroup,
        href: "/utilities/customer",
        priority: true
      },
      {
        id: uniqueId(),
        title: "Vendors",
        icon: IconUserCog,
        href: "/utilities/vendor"
      }
    ]
  },
  {
    name: "Expense",
    items: [
      {
        id: uniqueId(),
        title: "Expense",
        icon: IconUsersGroup,
        href: "/utilities/expenses",
        priority: true
      }
    ]
  },
  {
    name: "Auth",
    items: [
      {
        id: uniqueId(),
        title: "Login",
        icon: IconLogin,
        href: "/authentication/login"
      },
      {
        id: uniqueId(),
        title: "Register",
        icon: IconUserPlus,
        href: "/authentication/register"
      }
    ]
  }
];

const Menuitems: MenuItem[] = menuCategories.flatMap(category => [
  { navlabel: true, subheader: category.name },
  ...category.items
]);

export default Menuitems;
export { menuCategories };
