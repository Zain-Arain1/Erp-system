import React from 'react';
import { Card, CardContent, Typography, Chip, Button, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    unit: string;
    stock?: number;
  };
  onClick: () => void;
  isSelected?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, isSelected }) => {
  const theme = useTheme();
  
  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        border: `1px solid ${isSelected ? theme.palette.primary.main : theme.palette.divider}`,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[2],
          borderColor: isSelected ? theme.palette.primary.main : theme.palette.primary.light,
        },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardContent sx={{ flexGrow: 1, p: 1.5 }}>
        <Typography variant="subtitle2" component="div" gutterBottom sx={{ fontWeight: 500 }}>
          {product.name}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {product.unit}
          </Typography>
          {product.stock !== undefined && (
            <Chip 
              label={`${product.stock}`} 
              size="small" 
              color={product.stock > 0 ? 'success' : 'error'}
              variant="outlined"
              sx={{ height: 20, fontSize: '0.65rem' }}
            />
          )}
        </Box>
        <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 600 }}>
          Rs. {product.price.toFixed(2)}
        </Typography>
      </CardContent>
      <Box sx={{ p: 0.5, bgcolor: theme.palette.grey[100] }}>
        <Button 
          fullWidth 
          variant={isSelected ? 'contained' : 'outlined'}
          color="primary"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          sx={{
            fontWeight: isSelected ? 600 : 'normal',
            fontSize: '0.75rem',
            py: 0.5
          }}
        >
          {isSelected ? 'Selected' : 'Add'}
        </Button>
      </Box>
    </Card>
  );
};

export default ProductCard;