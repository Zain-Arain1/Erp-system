import { Department } from './departments';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half-day' | 'leave';

export interface Employee {
  _id: string;
  name: string;
  position: string;
  department: Department; 
  basicSalary: number;
  email?: string;
  contact: string;
  joinDate: string | Date;
  status: 'active' | 'inactive';
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SalaryRecord {
  _id: string;
  employeeId: string;
  employeeName: string;
  employeePosition: string;
  employeeAvatar?: string;
  department: string;
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  bonuses: number;
  netSalary: number;
  status: 'pending' | 'paid' | 'cancelled';
  paymentDate?: string;
  createdAt?: string;
  updatedAt?: string;
  employeeContact?: string;
  employeeEmail?: string;
}

export interface Advance {
  _id: string;
  employeeId: string | {
    _id: string;
    name: string;
    position: string;
    department: string;
    avatar?: string;
  };
  employeeName?: string;
  employeePosition?: string;
  employeeAvatar?: string;
  department?: string;
  amount: number;
  date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  repayments: {
    amount: number;
    date: string;
    _id: string;
  }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Attendance {
  _id: string;
  employeeId: string;
  employeeName?: string;
  date: string;
  status: AttendanceStatus;
  checkIn?: string;
  checkOut?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
} 