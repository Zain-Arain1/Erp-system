// departments.ts
import axios from 'axios';

const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/hrm`,
  withCredentials: true,
});

export type Department = string;

export interface DepartmentOperation {
  type: 'add' | 'delete';
  department: string;
}

class DepartmentService {
  private static instance: DepartmentService;
  private departments: Department[] = [];
  private listeners: ((depts: Department[]) => void)[] = [];

  private constructor() {}

  public static getInstance(): DepartmentService {
    if (!DepartmentService.instance) {
      DepartmentService.instance = new DepartmentService();
    }
    return DepartmentService.instance;
  }

  public async initialize(): Promise<void> {
    try {
      const response = await api.get('/departments');
      this.departments = response.data;
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to initialize departments:', error);
      this.departments = [
        'HR',
        'Finance',
        'Engineering',
        'Marketing',
        'Sales',
        'Operations',
        'Customer Support'
      ];
    }
  }

  public getDepartments(): Department[] {
    return [...this.departments];
  }

  public async addDepartment(name: string): Promise<void> {
    try {
      await api.post('/departments', { department: name });
      this.departments = [...this.departments, name];
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to add department:', error);
      throw error;
    }
  }

  public async deleteDepartment(name: string): Promise<void> {
    try {
      await api.delete(`/departments/${encodeURIComponent(name)}`);
      this.departments = this.departments.filter(d => d !== name);
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to delete department:', error);
      throw error;
    }
  }

  public subscribe(listener: (depts: Department[]) => void): () => void {
    this.listeners.push(listener);
    listener(this.departments);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    const currentDepartments = this.getDepartments();
    this.listeners.forEach(listener => listener(currentDepartments));
  }
}

export const departmentService = DepartmentService.getInstance();
departmentService.initialize();