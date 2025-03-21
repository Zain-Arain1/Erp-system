import React, { createContext, useContext, useState, useEffect } from "react";

// Export the Invoice interface
export interface Invoice {
  id: string;
  date: string;
  customer: string;
  dueDate: string;
  total: number;
  paid: number;
  due: number;
  status: "Paid" | "Pending" | "Overdue";
  paymentMethod: "Cash" | "Credit Card" | "Bank Transfer";
  notes: string;
}

interface InvoiceContextType {
  invoices: Invoice[];
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, updatedInvoice: Partial<Invoice>) => void;
}

const InvoiceContext = createContext<InvoiceContextType>({
  invoices: [],
  addInvoice: () => {},
  updateInvoice: () => {},
});

export const useInvoiceContext = () => useContext(InvoiceContext);

export const InvoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize state with invoices from localStorage (if they exist)
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Load invoices from localStorage on the client side
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedInvoices = localStorage.getItem("invoices");
      console.log("Initial Invoices from LocalStorage:", savedInvoices); // Debugging: Log initial invoices
      if (savedInvoices) {
        setInvoices(JSON.parse(savedInvoices));
      }
    }
  }, []);

  // Save invoices to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      console.log("Saving Invoices to LocalStorage:", invoices); // Debugging: Log invoices being saved
      localStorage.setItem("invoices", JSON.stringify(invoices));
    }
  }, [invoices]);

  // Function to add a new invoice
  const addInvoice = (invoice: Invoice) => {
    console.log("Adding Invoice to Context:", invoice); // Debugging: Log the invoice being added
    setInvoices((prev) => [...prev, invoice]);
  };

  // Function to update an existing invoice
  const updateInvoice = (id: string, updatedInvoice: Partial<Invoice>) => {
    console.log("Updating Invoice:", id, updatedInvoice); // Debugging: Log the invoice being updated
    setInvoices((prev) =>
      prev.map((invoice) =>
        invoice.id === id ? { ...invoice, ...updatedInvoice } : invoice
      )
    );
  };

  return (
    <InvoiceContext.Provider value={{ invoices, addInvoice, updateInvoice }}>
      {children}
    </InvoiceContext.Provider>
  );
};