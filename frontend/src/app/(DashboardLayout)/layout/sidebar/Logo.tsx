import { Box, styled } from '@mui/material';
import Image from 'next/image';

interface LogoProps {
  isCollapsed?: boolean;
}

const Logo = ({ isCollapsed = false }: LogoProps) => {
  const StyledLogoBox = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
 
    transition: theme.transitions.create('all', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.standard,
    }),
  }));

  return (
    <StyledLogoBox>
      <Image 
        src="/images/logos/image.svg" 
        alt="Company Logo"
        width={isCollapsed ? 56 : 190}  // Increased both sizes
        height={isCollapsed ? 48 : 48}  // Square in collapsed, proportional in expanded
        style={{
          objectFit: 'contain',
          transition: 'all 0.3s ease',
          width: '20rem',  // Let the image scale naturally
          height: isCollapsed ? '60px' : 'auto', // Fixed height when collapsed
           maxHeight: '80px', // Prevent it from becoming too tall
        }}
        priority // Important for above-the-fold images
      />
    </StyledLogoBox>
  );
};

export default Logo;