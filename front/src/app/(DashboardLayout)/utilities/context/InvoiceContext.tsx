/* The above code is creating a context and provider in a TypeScript React application for managing
invoices. */
import React, { createContext, useContext, useState, useEffect } from "react";
import * as invoiceService from '@/services/invoiceService';

export interface Product {
  id?: string | number;  // Make id optional
  name: string;
  quantity: number;
  price: number;
}

export interface Invoice {
  id: string;
  _id?: string;
  invoiceNumber?: string;
  date: string;
  customer?: string;
  customerDetails?: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  dueDate: string;
  products: Product[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paid: number;
  due: number;
  status: "Paid" | "Pending" | "Overdue";
  paymentMethod: "Cash" | "CreditCard" | "BankTransfer";
  notes: string;
  invoiceImage?: string;
}

interface InvoiceContextType {
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
  addInvoice: (invoice: Omit<Invoice, 'id'>) => Promise<Invoice>;
  updateInvoice: (id: string, updatedInvoice: Partial<Invoice>) => Promise<Invoice>;
  deleteInvoice: (id: string) => Promise<void>;
  addPayment: (id: string, amount: number) => Promise<Invoice>;
  refreshInvoices: () => Promise<void>;
  getInvoiceById: (id: string) => Promise<Invoice>; // New addition
}

const InvoiceContext = createContext<InvoiceContextType>({
  invoices: [],
  loading: false,
  error: null,
  addInvoice: async () => ({} as Invoice),
  updateInvoice: async () => ({} as Invoice),
  deleteInvoice: async () => {},
  addPayment: async () => ({} as Invoice),
  refreshInvoices: async () => {},
  getInvoiceById: async () => ({} as Invoice) // New addition
});

export const useInvoiceContext = () => useContext(InvoiceContext);

export const InvoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await invoiceService.getInvoices();
      const processedInvoices = data.invoices.map((invoice: any) => ({
        ...invoice,
        id: invoice._id || invoice.id
      }));
      setInvoices(processedInvoices);
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
      setError("Failed to fetch invoices. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const getInvoiceById = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const invoice = await invoiceService.getInvoiceById(id);
      const processedInvoice = {
        ...invoice,
        id: invoice._id || invoice.id
      };
      return processedInvoice;
    } catch (err) {
      console.error(`Failed to fetch invoice ${id}:`, err);
      setError(`Failed to fetch invoice. Please try again.`);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const addInvoice = async (invoiceData: Omit<Invoice, 'id'>) => {
    setLoading(true);
    setError(null);
    try {
      // Validate customer
      if (!invoiceData.customerDetails?._id && !invoiceData.customer) {
        throw new Error("Customer is required");
      }

      // Prepare products with validation
      const validatedProducts = invoiceData.products.map(p => ({
        name: p.name.trim(),
        quantity: Math.max(1, p.quantity),
        price: parseFloat(Math.max(0, p.price).toFixed(2))
      }));

      const backendInvoiceData = {
        ...invoiceData,
        customer: invoiceData.customerDetails?._id || invoiceData.customer || '',
        products: validatedProducts,
        date: invoiceData.date || new Date().toISOString().split('T')[0],
        dueDate: invoiceData.dueDate || invoiceData.date,
        tax: parseFloat((invoiceData.tax || 0).toFixed(2)),
        discount: parseFloat((invoiceData.discount || 0).toFixed(2)),
        paid: parseFloat((invoiceData.paid || 0).toFixed(2))
      };
  
      const newInvoice = await invoiceService.createInvoice(backendInvoiceData);
      const processedInvoice = {
        ...newInvoice,
        id: newInvoice._id || newInvoice.id,
        _id: undefined // Remove _id if you want only id
      };

      setInvoices(prev => [...prev, processedInvoice]);
      return processedInvoice;
    } catch (err: any) {
      console.error("Failed to create invoice:", err);
      const errorMsg = err.response?.data?.message || err.message || "Failed to create invoice";
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const updateInvoice = async (id: string, updatedData: Partial<Invoice>) => {
    setLoading(true);
    setError(null);
    try {
      const dataToUpdate = {
        ...updatedData,
        customer: updatedData.customerDetails?._id || updatedData.customer
      };

      const updatedInvoice = await invoiceService.updateInvoice(id, dataToUpdate);
      const processedInvoice = {
        ...updatedInvoice,
        id: updatedInvoice._id || updatedInvoice.id
      };

      setInvoices(prev => 
        prev.map(inv => inv.id === id ? processedInvoice : inv)
      );
      return processedInvoice;
    } catch (err) {
      console.error("Failed to update invoice:", err);
      setError("Failed to update invoice. Please try again.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteInvoice = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await invoiceService.deleteInvoice(id);
      setInvoices(prev => prev.filter(inv => inv.id !== id));
    } catch (err) {
      console.error("Failed to delete invoice:", err);
      setError("Failed to delete invoice. Please try again.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const addPayment = async (id: string, amount: number) => {
    setLoading(true);
    setError(null);
    try {
      const updatedInvoice = await invoiceService.addPayment(id, amount);
      const processedInvoice = {
        ...updatedInvoice,
        id: updatedInvoice._id || updatedInvoice.id
      };

      setInvoices(prev => 
        prev.map(inv => inv.id === id ? processedInvoice : inv)
      );
      return processedInvoice;
    } catch (err) {
      console.error("Failed to add payment:", err);
      setError("Failed to add payment. Please try again.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshInvoices = async () => {
    await fetchInvoices();
  };

  return (
    <InvoiceContext.Provider value={{ 
      invoices, 
      loading,
      error,
      addInvoice, 
      updateInvoice,
      deleteInvoice,
      addPayment,
      refreshInvoices,
      getInvoiceById // Added to the provider value
    }}>
      {children}
    </InvoiceContext.Provider>
  );
};