import React from "react";
import { Card as MUICard, CardContent, Typography, Grid } from "@mui/material";

// Invoice Interface
interface Invoice {
  id: string;
  date: string;
  customer: string;
  total: number;
  paid: number;
  due: number;
  dueDate: string;
}

interface CardProps {
  title: string;
  value: string;
  color: string;
}

const Card: React.FC<CardProps> = ({ title, value, color }) => {
  return (
    <MUICard variant="outlined" sx={{ width: 230, height: 112, display: 'flex', 
      flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign: 'center'  }}>
      <CardContent>
        <Typography variant="h5" component="div" sx={{ color }}>
          {value}
        </Typography>
        <Typography variant="h6" color="text.secondary">
          {title}
        </Typography>
      </CardContent>
    </MUICard>
  );
};

interface CardsProps {
  invoices: Invoice[];
}

const Cards: React.FC<CardsProps> = ({ invoices }) => {
  // Ensure invoices is defined
  const validInvoices = invoices || [];

  // Compute values based on invoices
  const totalSales = validInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const totalPaid = validInvoices.reduce((sum, invoice) => sum + invoice.paid, 0);
  const totalDue = validInvoices.reduce((sum, invoice) => sum + invoice.due, 0);

  return (
    <Grid container spacing={2} justifyContent="center" padding={2}>
      <Grid item>
        <Card title="TOTAL SALES" value={`$${totalSales.toLocaleString()}`} color="blue" />
      </Grid>
      <Grid item>
        <Card title="TOTAL SALES PAID" value={`$${totalPaid.toLocaleString()}`} color="blue" />
      </Grid>
      <Grid item>
        <Card title="TOTAL SALES DUE" value={`$${totalDue.toLocaleString()}`} color="red" />
      </Grid>
    </Grid>
  );
};

export default Cards;