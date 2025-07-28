import { ListSubheader, styled, Theme, IconButton, Tooltip } from '@mui/material';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';

type NavGroup = {
  name: string;
  icon: any;
  items: any[];
};

interface ItemType {
  category: NavGroup;
  isOpen: boolean;
  isSidebarOpen: boolean;
  toggleCategory: () => void;
}

const NavGroup = ({ category, isOpen, isSidebarOpen, toggleCategory }: ItemType) => {
  const ListSubheaderStyle = styled((props: Theme | any) => <ListSubheader disableSticky {...props} />)(
    ({ theme }) => ({
      ...theme.typography.overline,
      fontWeight: '600',
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(0),
      color: theme.palette.text.secondary,
      lineHeight: '26px',
      padding: isSidebarOpen ? '6px 12px' : '6px 8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: '6px',
      transition: theme.transitions.create(['background-color', 'padding'], {
        duration: theme.transitions.duration.shortest,
      }),
      '&:hover': {
        backgroundColor: theme.palette.action.hover,
        cursor: 'pointer',
      },
    })
  );

  const CategoryIcon = category.icon;

  return (
    <Tooltip title={!isSidebarOpen ? category.name : ''} placement="right">
      <ListSubheaderStyle onClick={toggleCategory}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CategoryIcon size={20} stroke={1.5} />
          {isSidebarOpen && (
            <span style={{ 
              opacity: isSidebarOpen ? 1 : 0,
              transition: 'opacity 0.2s ease',
              whiteSpace: 'nowrap'
            }}>
              {category.name}
            </span>
          )}
        </div>
        {isSidebarOpen && (
          <IconButton size="small" sx={{ p: 0 }}>
            {isOpen ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
          </IconButton>
        )}
      </ListSubheaderStyle>
    </Tooltip>
  );
};

export default NavGroup;