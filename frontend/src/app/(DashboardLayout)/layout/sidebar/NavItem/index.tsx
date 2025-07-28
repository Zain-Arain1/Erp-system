import React from "react";
import {
  ListItemIcon,
  ListItem,
  List,
  styled,
  ListItemText,
  useTheme,
  ListItemButton,
  Tooltip,
} from "@mui/material";
import Link from "next/link";

type NavGroup = {
  id?: string;
  navlabel?: boolean;
  subheader?: string;
  title?: string;
  icon?: any;
  href?: string;
  disabled?: boolean;
  external?: boolean;
  onClick?: React.MouseEvent<HTMLButtonElement, MouseEvent>;
};

interface ItemType {
  item: NavGroup;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  hideMenu?: any;
  level?: number | any;
  pathDirect: string;
  isSidebarOpen: boolean;
}

const NavItem = ({ item, level = 1, pathDirect, isSidebarOpen, onClick }: ItemType) => {
  const theme = useTheme();
  const Icon = item.icon;
  const itemIcon = <Icon stroke={1.5} size="1.3rem" />;

  const ListItemStyled = styled(ListItem)(() => ({
    padding: 0,
    ".MuiButtonBase-root": {
      whiteSpace: "nowrap",
      marginBottom: "4px",
      padding: "6px 12px",
      borderRadius: "6px",
      backgroundColor: level > 1 ? "transparent !important" : "inherit",
      color: theme.palette.text.secondary,
      paddingLeft: isSidebarOpen ? `${12 + 20 * level}px` : '12px',
      minHeight: '40px',
      justifyContent: isSidebarOpen ? 'flex-start' : 'center',
      transition: theme.transitions.create(['background-color', 'padding'], {
        duration: theme.transitions.duration.shortest,
      }),
      "&:hover": {
        backgroundColor: theme.palette.primary.light,
        color: theme.palette.primary.main,
      },
      "&.Mui-selected": {
        color: "white",
        backgroundColor: theme.palette.primary.main,
        "&:hover": {
          backgroundColor: theme.palette.primary.main,
          color: "white",
        },
      },
    },
  }));

  const listItemContent = (
    <ListItemButton
      component={Link}
      href={item.href || "#"}
      disabled={item.disabled ?? false}
      selected={pathDirect === item.href}
      target={item.external ? "_blank" : ""}
      onClick={onClick}
    >
      <ListItemIcon
        sx={{
          minWidth: 'auto',
          color: 'inherit',
          mr: isSidebarOpen ? 1.5 : 0,
        }}
      >
        {itemIcon}
      </ListItemIcon>
      {isSidebarOpen && (
        <ListItemText
          primary={item.title}
          sx={{
            opacity: isSidebarOpen ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        />
      )}
    </ListItemButton>
  );

  return (
    <List component="div" disablePadding key={item.id}>
      <ListItemStyled>
        {!isSidebarOpen ? (
          <Tooltip title={item.title} placement="right">
            {listItemContent}
          </Tooltip>
        ) : (
          listItemContent
        )}
      </ListItemStyled>
    </List>
  );
};

export default NavItem;