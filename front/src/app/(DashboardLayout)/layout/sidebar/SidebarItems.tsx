import React from "react";
import Menuitems from "./MenuItems";
import { usePathname } from "next/navigation";
import { Box, List } from "@mui/material";
import NavItem from "./NavItem";
import NavGroup from "./NavGroup/NavGroup";
import type { MenuItem } from "./types"; // ✅ Adjust path if needed

interface SidebarItemsProps {
  toggleMobileSidebar: (event: React.MouseEvent<HTMLElement>) => void;
}
const SidebarItems = ({ toggleMobileSidebar }: SidebarItemsProps) => {
  const pathname = usePathname();
  const pathDirect = pathname;

  return (
    <Box sx={{ px: 3 }}>
      <List sx={{ pt: 0 }} className="sidebarNav" component="div">
        {Menuitems.map((item: MenuItem) => {
          if ("subheader" in item) {
            // This is a NavLabelItem
            return <NavGroup item={item} key={item.subheader} />;
          } else {
            // This is a NavLinkItem
            return (
              <NavItem
                item={item}
                key={item.id}
                pathDirect={pathDirect}
                onClick={toggleMobileSidebar}
              />
            );
          }
        })}
      </List>
    </Box>
  );
};

export default SidebarItems;
