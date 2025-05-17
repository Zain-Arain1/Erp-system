export interface DailyEntry {
  _id: string;
  name: string;
  amount: number;
  category: string;
  date: string | Date;
  description?: string;
  receipt?: boolean;
}

export interface MonthlyEntry {
  _id: string;
  name: string;
  amount: number;
  date: string | Date;
  periodStart: string | Date;
  periodEnd: string | Date;
  monthlyTotal: number;
  month: number;
  categoryBreakdown: Record<string, number>;
  dailyEntries: DailyEntry[];
}

export interface Expense {
  dateprudh: string | number | Date;
  receipt: boolean;
  categoryBreakdown: {};
  dailyEntries: never[];
  _id: string;
  name: string;
  amount: number;
  date: string | Date;
  periodType: 'daily' | 'monthly' | 'yearly';
  periodStart: string | Date;
  periodEnd: string | Date;
  yearlyTotal?: number;
  year?: number;
  monthlyEntries?: MonthlyEntry[];
  monthlyTotal?: number;
  status?: string;
  description?: string;
  category?: string;
}
// Add or verify the export for LocalExpense
export interface LocalExpense {
  _id: string;
  name: string;
  category: string;
  amount: number;
  date: string | Date;
  description?: string;
  receipt?: boolean;
  yearlyTotal?: number;

}