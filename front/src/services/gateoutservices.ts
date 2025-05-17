/* This TypeScript code snippet is defining functions to interact with a backend API for managing gate
out entries. Here's a breakdown of what each part of the code is doing: */
import axios from 'axios';

export interface GateOutEntry {
  _id?: string;
  invoice: number;
  customer: string;
  units: string;
  quantity: number;
  saleprice: number;
  total: number;
  paymentStatus: 'Paid' | 'Overdue' | 'Pending';
  date: string;
  from: string;
}

const API_BASE_URL = 'http://localhost:5000/api/gate-out';

export const getGateOutEntries = async (): Promise<GateOutEntry[]> => {
  const response = await axios.get<GateOutEntry[]>(API_BASE_URL);
  return response.data;
};

export const createGateOutEntry = async (entryData: Omit<GateOutEntry, '_id' | 'invoice'>): Promise<GateOutEntry> => {
  const response = await axios.post<GateOutEntry>(API_BASE_URL, entryData);
  return response.data;
};

export const updateGateOutEntry = async (id: string, entryData: Partial<GateOutEntry>): Promise<GateOutEntry> => {
  const response = await axios.put<GateOutEntry>(`${API_BASE_URL}/${id}`, entryData);
  return response.data;
};

export const deleteGateOutEntry = async (id: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/${id}`);
};