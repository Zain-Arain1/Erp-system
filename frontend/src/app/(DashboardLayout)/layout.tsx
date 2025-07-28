"use client";
import { styled, Container, Box } from "@mui/material";
import React, { useState } from "react";
import Header from "@/app/(DashboardLayout)/layout/header/Header";
import Sidebar from "@/app/(DashboardLayout)/layout/sidebar/Sidebar";
import { InvoiceProvider } from "./utilities/context/InvoiceContext";
import { CustomerProvider } from "./utilities/context/CustomerContext";
import { VendorProvider } from "./utilities/context/vendorContext";
import { SnackbarProvider } from 'notistack';

const MainWrapper = styled("div")(() => ({
  display: "flex",
  minHeight: "100vh",
  width: "100%",
  overflow: "hidden",
  boxSizing: "border-box",
}));

const PageWrapper = styled("div")(() => ({
  display: "flex",
  flexGrow: 1,
  flexDirection: "column",
  paddingBottom: "60px",
  backgroundColor: "transparent",
  boxSizing: "border-box",
  width: "100%",
  overflowX: "hidden",
}));

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  return (
    <MainWrapper className="mainwrapper">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onSidebarClose={() => setMobileSidebarOpen(false)}
        toggleSidebar={toggleSidebar}
      />
      <PageWrapper className="page-wrapper">
        <Header
          toggleMobileSidebar={() => setMobileSidebarOpen(true)}
          toggleSidebar={toggleSidebar}
        />
        <Container
          maxWidth={false}
          disableGutters
          sx={{
            width: "100%",
            height: "100%",
            padding: 2,
            margin: 0,
            boxSizing: "border-box",
          }}
        >
          <Box
            sx={{
              minHeight: "calc(100vh - 170px)",
              width: "100%",
              overflowX: "hidden",
            }}
          >
            <SnackbarProvider
              maxSnack={3}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              autoHideDuration={3000}
              preventDuplicate
            >
              <CustomerProvider>
                <InvoiceProvider>
                  <VendorProvider>{children}</VendorProvider>
                </InvoiceProvider>
              </CustomerProvider>
            </SnackbarProvider>
          </Box>
        </Container>
      </PageWrapper>
    </MainWrapper>
  );
}