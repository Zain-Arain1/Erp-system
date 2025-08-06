import axios from 'axios';

export interface Payment {
  amount: number;
  date: string;
  method: 'Cash' | 'Bank Transfer' | 'Cheque' | 'Other';
  reference?: string;
}

export interface Item {
  name: string;
  units: string;
  quantity: number;
  purchasePrice: number;
  total: number;
}

export interface GateEntry {
  _id?: string;
 invoiceNumber?: number; 
  items: Item[];
  vendor: string;
  vendorId: string;
  totalAmount: number;
  paymentStatus: 'Paid' | 'Partial' | 'Pending';
  date: string;
  payments: Payment[];
  createdAt?: string;
  updatedAt?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/gate-in';

export const getGateEntries = async (): Promise<GateEntry[]> => {
  try {
    const response = await axios.get<GateEntry[]>(API_BASE_URL);
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch gate entries');
  }
};

export const getGateEntry = async (id: string): Promise<GateEntry> => {
  try {
    const response = await axios.get<GateEntry>(`${API_BASE_URL}/${id}`);
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch gate entry');
  }
};

// Updated createGateEntry with proper type for entryData
export const createGateEntry = async (
  entryData: Omit<GateEntry, '_id' | 'createdAt' | 'updatedAt' | 'invoiceNumber'>
): Promise<GateEntry> => {
  try {
    // Add client-side validation
    if (!entryData.vendor || !entryData.vendorId) {
      throw new Error('Vendor information is required');
    }
    if (!entryData.items || entryData.items.length === 0) {
      throw new Error('At least one item is required');
    }

    // No need to remove invoiceNumber here since it's already omitted from the type
    const response = await axios.post<GateEntry>(API_BASE_URL, entryData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.status >= 200 && response.status < 300) {
      return response.data;
    }
    throw new Error(`Server responded with status ${response.status}`);
  } catch (error: any) {
    console.error('API Error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || 
      error.message || 
      'Failed to create gate entry. Please try again.'
    );
  }
};

export const updateGateEntry = async (
  id: string,
  entryData: Partial<GateEntry>
): Promise<GateEntry> => {
  try {
    const response = await axios.put<GateEntry>(`${API_BASE_URL}/${id}`, entryData);
    return response.data;
  } catch (error) {
    throw new Error('Failed to update gate entry');
  }
};

export const addPayment = async (
  id: string,
  paymentData: Payment
): Promise<GateEntry> => {
  try {
    const response = await axios.post<GateEntry>(
      `${API_BASE_URL}/${id}/payments`,
      paymentData
    );
    return response.data;
  } catch (error) {
    throw new Error('Failed to add payment');
  }
};

export const deleteGateEntry = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_BASE_URL}/${id}`);
  } catch (error) {
    throw new Error('Failed to delete gate entry');
  }
};