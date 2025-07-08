"use client";
import { styled, Container, Box } from "@mui/material";
import React, { useState } from "react";
import Header from "@/app/(DashboardLayout)/layout/header/Header";
import Sidebar from "@/app/(DashboardLayout)/layout/sidebar/Sidebar";
import { InvoiceProvider } from "./utilities/context/InvoiceContext";
import { CustomerProvider } from "./utilities/context/CustomerContext";
import { VendorProvider } from "./utilities/context/vendorContext";

const MainWrapper = styled("div")(() => ({
  display: "flex",
  minHeight: "100vh",
  width: "100%",
}));

const PageWrapper = styled("div")(() => ({
  display: "flex",
  flexGrow: 1,
  paddingBottom: "60px",
  flexDirection: "column",
  zIndex: 1,
  backgroundColor: "transparent",
}));

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <MainWrapper className="mainwrapper">
      {/* ------------------------------------------- */}
      {/* Sidebar */}
      {/* ------------------------------------------- */}
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onSidebarClose={() => setMobileSidebarOpen(false)}
        // Remove ModalProps from here as it's not accepted by your Sidebar component
      />
      {/* ------------------------------------------- */}
      {/* Main Wrapper */}
      {/* ------------------------------------------- */}
      <PageWrapper className="page-wrapper">
        {/* ------------------------------------------- */}
        {/* Header */}
        {/* ------------------------------------------- */}
        <Header toggleMobileSidebar={() => setMobileSidebarOpen(true)} />
        {/* ------------------------------------------- */}
        {/* PageContent */}
        {/* ------------------------------------------- */}
        <Container
          maxWidth={false}
          sx={{
            paddingTop: "20px",
            width: "100%",
            px: { xs: 2, sm: 3, md: 4 },
          }}
        >
          <Box sx={{ minHeight: "calc(100vh - 170px)" }}>
            <CustomerProvider>
              <InvoiceProvider>
                <VendorProvider>
                  {children}
                </VendorProvider>
              </InvoiceProvider>
            </CustomerProvider>
          </Box>
        </Container>
      </PageWrapper>
    </MainWrapper>
  );
}