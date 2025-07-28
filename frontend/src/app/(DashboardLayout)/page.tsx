'use client';
import { Grid, Box } from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
// components
import SalesOverview from '@/app/(DashboardLayout)/components/dashboard/SalesOverview';
import YearlyBreakup from '@/app/(DashboardLayout)/components/dashboard/YearlyBreakup';
import RecentTransactions from '@/app/(DashboardLayout)/components/dashboard/RecentTransactions';
import ColumnGroupingTable from '@/app/(DashboardLayout)/components/dashboard/ColumnGroupingTable';
import Blog from '@/app/(DashboardLayout)/components/dashboard/Blog';
import MonthlyEarnings from '@/app/(DashboardLayout)/components/dashboard/MonthlyEarnings';

const Dashboard = () => {
  return (
    <PageContainer title="Dashboard" description="this is Dashboard">
      <Box >
        <Grid container spacing={3}>
          {/* Sales Overview - takes full width on mobile, 8/12 on large */}
          <Grid item xs={12} md={12} lg={8} xl={8}>
            <SalesOverview />
          </Grid>

          {/* Right Column - stacked on mobile, side by side on large */}
          <Grid item xs={12} md={12} lg={4} xl={4}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <YearlyBreakup />
              </Grid>
              <Grid item xs={12}>
                <MonthlyEarnings />
              </Grid>
            </Grid>
          </Grid>

          {/* Transactions - full width on small, 4/12 on large */}
          <Grid item xs={12} md={6} lg={4} xl={4}>
            <RecentTransactions />
          </Grid>

          {/* Table - full width on small, 8/12 on large */}
          <Grid item xs={12} md={6} lg={8} xl={8}>
            <ColumnGroupingTable />
          </Grid>

          {/* Blog - always full width */}
          <Grid item xs={12}>
            <Blog />
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default Dashboard;
