/* This TypeScript code snippet is defining functions to interact with an API for managing invoices.
Here's a breakdown of what each part of the code is doing: */
import axios from 'axios';
import { Invoice, Product } from '@/app/(DashboardLayout)/utilities/context/InvoiceContext';

const API_URL = 'http://localhost:5000/api/invoices';

interface InvoiceResponse {
  invoices: Invoice[];
  totalPages?: number;
  currentPage?: number;
}

interface CreateInvoicePayload {
  customer: string;
  date: string;
  dueDate: string;
  products: Product[];
  subtotal?: number;
  tax?: number;
  discount?: number;
  total: number;
  paid?: number;
  due?: number;
  status?: "Paid" | "Pending" | "Overdue";
  paymentMethod: "Cash" | "CreditCard" | "BankTransfer";
  notes?: string;
}

export const getInvoices = async (
  page: number = 1, 
  limit: number = 10, 
  search: string = ''
): Promise<InvoiceResponse> => {
  try {
    const response = await axios.get<InvoiceResponse>(
      `${API_URL}?page=${page}&limit=${limit}&search=${search}`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching invoices:', error);
    throw error;
  }
};

export const getInvoiceById = async (id: string): Promise<Invoice> => {
  try {
    const response = await axios.get<Invoice>(`${API_URL}/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching invoice ${id}:`, error);
    throw error;
  }
};

export const createInvoice = async (
  invoiceData: CreateInvoicePayload
): Promise<Invoice> => {
  try {
    // Validate dates
    if (invoiceData.dueDate && new Date(invoiceData.dueDate) < new Date(invoiceData.date)) {
      throw new Error('Due date cannot be before invoice date');
    }

    // Validate products
    if (!invoiceData.products || invoiceData.products.length === 0) {
      throw new Error('At least one product is required');
    }

    const response = await axios.post<Invoice>(API_URL, invoiceData);

    // Ensure consistent ID handling
    return {
      ...response.data,
      id: response.data._id || response.data.id,
      _id: undefined
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const serverMessage = error.response?.data?.message;
      throw new Error(serverMessage || error.message);
    }
    throw error;
  }
};

export const updateInvoice = async (
  id: string, 
  invoiceData: Partial<CreateInvoicePayload>
): Promise<Invoice> => {
  try {
    const response = await axios.put<Invoice>(`${API_URL}/${id}`, invoiceData);
    return response.data;
  } catch (error) {
    console.error(`Error updating invoice ${id}:`, error);
    throw error;
  }
};

export const deleteInvoice = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/${id}`);
  } catch (error) {
    console.error(`Error deleting invoice ${id}:`, error);
    throw error;
  }
};

export const addPayment = async (
  id: string, 
  amount: number
): Promise<Invoice> => {
  try {
    if (amount <= 0) {
      throw new Error('Payment amount must be positive');
    }

    const response = await axios.post<Invoice>(
      `${API_URL}/${id}/payments`, 
      { amount }
    );
    return response.data;
  } catch (error) {
    console.error(`Error adding payment to invoice ${id}:`, error);
    throw error;
  }
};

export const generateInvoicePDF = async (id: string): Promise<Blob> => {
  try {
    const response = await axios.get(`${API_URL}/${id}/pdf`, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error(`Error generating PDF for invoice ${id}:`, error);
    throw error;
  }
};
// Add this to your invoiceService.ts
export const getInvoicesByCustomer = async (customerId: string): Promise<Invoice[]> => {
  try {
    const response = await axios.get<Invoice[]>(`${API_URL}/customer/${customerId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching invoices for customer ${customerId}:`, error);
    throw error;
  }
};
