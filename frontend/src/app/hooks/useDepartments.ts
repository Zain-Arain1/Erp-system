// useDepartments.ts
import { useState, useEffect } from 'react';
import { departmentService, Department } from '../(DashboardLayout)/utilities/HRM/departments';

// Update your useDepartments hook to explicitly define the return type
export const useDepartments = (): {
  departments: string[];
  addDepartment: (name: string) => Promise<void>;
  deleteDepartment: (name: string) => Promise<void>;
} => {
  const [departments, setDepartments] = useState<string[]>(
    departmentService.getDepartments()
  );

  useEffect(() => {
    return departmentService.subscribe(setDepartments);
  }, []);

  return {
    departments,
    addDepartment: departmentService.addDepartment.bind(departmentService),
    deleteDepartment: departmentService.deleteDepartment.bind(departmentService)
  };
};