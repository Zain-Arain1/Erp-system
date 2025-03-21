import {
  IconAperture,
  IconCopy,
  IconLayoutDashboard,
  IconLogin,
  IconMoodHappy,
  IconTypography,
  IconUserPlus,
  IconSortDescending2,
  IconFileInvoice,
  IconUsersGroup,
  IconUserCog ,
} from "@tabler/icons-react";

import { uniqueId } from "lodash";

const Menuitems = [
  {
    navlabel: true,
    subheader: "Main",
  },

  {
    id: uniqueId(),
    title: "Dashboard",
    icon: IconLayoutDashboard,
    href: "/",
  },
  {
    navlabel: true,
    subheader: "Inventory",
  },
  {
    id: uniqueId(),
    title: "Gate In",
    icon: IconTypography,
    href: "/utilities/gatein",
  },
  {
    id: uniqueId(),
    title: "Gate Out",
    icon:  IconSortDescending2,
    href: "/utilities/gateout",
  },
  {
    id: uniqueId(),
    title: "Invoices",
    icon: IconFileInvoice,
    href: "/utilities/invoices",
  },
  //changings
  {
    navlabel: true,
    subheader: "Sale",
  },
  {
    id: uniqueId(),
    title: "Sale invoice",
    icon: IconFileInvoice,
    href: "/utilities/saleinvoices",
  },
  {
    id: uniqueId(),
    title: "Sale Returns",
    icon: IconCopy,
    href: "/utilities/salesreturn",
  },
  {
    navlabel: true,
    subheader: "Customer",
  },
  {
    id: uniqueId(),
    title: "Customers",
    icon: IconUsersGroup,
    href: "/utilities/customer",
  },
  {
    id: uniqueId(),
    title: "Vendors",
    icon: IconUserCog ,
    href: "/utilities/vendor",
  },
  {
    navlabel: true,
    subheader: "Auth",
  },
  {
    id: uniqueId(),
    title: "Login",
    icon: IconLogin,
    href: "/authentication/login",
  },
  {
    id: uniqueId(),
    title: "Register",
    icon: IconUserPlus,
    href: "/authentication/register",
  },
  {
    navlabel: true,
    subheader: "Extra",
  },
  {
    id: uniqueId(),
    title: "Icons",
    icon: IconMoodHappy,
    href: "/icons",
  },
  {
    id: uniqueId(),
    title: "Sample Page",
    icon: IconAperture,
    href: "/sample-page",
  },
];

export default Menuitems;
