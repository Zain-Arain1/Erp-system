import { ComponentType } from "react";
import { TablerIconsProps } from "@tabler/icons-react";

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
