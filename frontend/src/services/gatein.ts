/* This TypeScript code snippet is defining functions to interact with a backend API for managing gate
entries. Here's a breakdown of what each part of the code is doing: */
import axios from 'axios';

// Define TypeScript interfaces for your data
export interface GateEntry {
  _id?: string;
  invoice: number;
  customer: string;
  units: string;
  quantity: number;
  purchaseprice: number;
  total: number;
  paymentStatus: 'Paid' | 'Overdue' | 'Pending';
  date: string;
  vendor: string;
}

const API_BASE_URL = 'http://localhost:5000/api/gate-in'; // Adjust if needed

// Fetch all gate entries
export const getGateEntries = async (): Promise<GateEntry[]> => {
  const response = await axios.get<GateEntry[]>(API_BASE_URL);
  return response.data;
};

// Create a new gate entry
export const createGateEntry = async (entryData: Omit<GateEntry, '_id' | 'invoice'>): Promise<GateEntry> => {
  try {
    const response = await axios.post<GateEntry>(API_BASE_URL, entryData);
    return response.data;
  } catch (error) {
    console.error('Error creating gate entry:', error);
    throw error;
  }
};

// Update a gate entry
export const updateGateEntry = async (id: string, entryData: Partial<GateEntry>): Promise<GateEntry> => {
  try {
    const response = await axios.put<GateEntry>(`${API_BASE_URL}/${id}`, entryData);
    return response.data;
  } catch (error) {
    console.error('Error updating gate entry:', error);
    throw error;
  }
};

// Delete a gate entry
export const deleteGateEntry = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_BASE_URL}/${id}`);
  } catch (error) {
    console.error('Error deleting gate entry:', error);
    throw error;
  }
};