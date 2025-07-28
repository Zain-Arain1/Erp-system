import React, { useState, useEffect } from "react";
import { menuCategories } from "./MenuItems";
import { usePathname } from "next/navigation";
import { Box, List, Collapse, styled } from "@mui/material";
import NavItem from "./NavItem";
import NavGroup from "./NavGroup/NavGroup";

interface SidebarItemsProps {
  isSidebarOpen: boolean;
  toggleMobileSidebar?: (event: React.MouseEvent<HTMLElement>) => void;
}

const SidebarItems = ({ isSidebarOpen, toggleMobileSidebar }: SidebarItemsProps) => {
  const pathname = usePathname();
  const pathDirect = pathname;
  const [openCategories, setOpenCategories] = useState<string[]>([]);

  useEffect(() => {
    const activeCategory = menuCategories.find(category => 
      category.paths.some(path => pathDirect.startsWith(path))
    );
    setOpenCategories(activeCategory ? [activeCategory.name] : []);
  }, [pathDirect]);

  const toggleCategory = (categoryName: string) => {
    setOpenCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((name) => name !== categoryName)
        : [categoryName]
    );
  };

  const StyledList = styled(List)(({ theme }) => ({
    padding: 0,
    '& .MuiListItemButton-root': {
      transition: theme.transitions.create(['padding', 'opacity'], {
        duration: theme.transitions.duration.shortest,
      }),
    },
  }));

  return (
    <Box sx={{ px: { xs: 1, lg: isSidebarOpen ? 2 : 1 } }}>
      {/* Remove the component="div" prop since StyledList is already a List component */}
      <StyledList sx={{ pt: 0 }}>
        {menuCategories.map((category) => (
          <React.Fragment key={category.name}>
            <NavGroup
              category={category}
              isOpen={openCategories.includes(category.name)}
              isSidebarOpen={isSidebarOpen}
              toggleCategory={() => toggleCategory(category.name)}
            />
            <Collapse in={openCategories.includes(category.name)} timeout="auto" unmountOnExit>
              {/* Keep component="div" here since this is the base List component */}
              <List component="div" disablePadding>
                {category.items.map((item) => (
                  <NavItem
                    item={item}
                    key={item.id}
                    pathDirect={pathDirect}
                    isSidebarOpen={isSidebarOpen}
                    onClick={toggleMobileSidebar}
                  />
                ))}
              </List>
            </Collapse>
          </React.Fragment>
        ))}
      </StyledList>
    </Box>
  );
};

export default SidebarItems;