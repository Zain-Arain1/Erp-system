import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

// MongoDB returns ObjectId as string, so we use string here
interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: "Active" | "Inactive";
}

interface CustomerContextType {
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, "id">) => Promise<void>;
  updateCustomer: (id: string, updatedCustomer: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  refreshCustomers: () => Promise<void>;
}

const CustomerContext = createContext<CustomerContextType>({
  customers: [],
  addCustomer: async () => {},
  updateCustomer: async () => {},
  deleteCustomer: async () => {},
  isLoading: false,
  error: null,
  refreshCustomers: async () => {},
});

export const useCustomerContext = () => useContext(CustomerContext);

export const CustomerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/customers`);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to fetch customers');
      }
      
      const data = await res.json();
      const mapped = data.map((customer: any) => ({
        ...customer,
        id: customer._id,
      }));

      setCustomers(mapped);
    } catch (error: any) {
      setError(error.message || "Failed to fetch customers");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load customers from backend on mount
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Add a new customer (API + state)
  const addCustomer = async (customer: Omit<Customer, "id">) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customer),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to add customer');
      }
      
      const newCustomer = await res.json();
      setCustomers((prev) => [...prev, { ...newCustomer, id: newCustomer._id }]);
    } catch (error: any) {
      setError(error.message || "Failed to add customer");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Update an existing customer (API + state)
  const updateCustomer = async (id: string, updatedCustomer: Partial<Customer>) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedCustomer),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update customer');
      }
      
      const updated = await res.json();
      setCustomers((prev) =>
        prev.map((cust) => (cust.id === id ? { ...cust, ...updated } : cust))
      );
    } catch (error: any) {
      setError(error.message || "Failed to update customer");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a customer (API + state)
  const deleteCustomer = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/customers/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete customer');
      }
      
      setCustomers((prev) => prev.filter((cust) => cust.id !== id));
    } catch (error: any) {
      setError(error.message || "Failed to delete customer");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCustomers = useCallback(async () => {
    await fetchCustomers();
  }, [fetchCustomers]);

  return (
    <CustomerContext.Provider value={{ 
      customers, 
      addCustomer, 
      updateCustomer, 
      deleteCustomer,
      isLoading,
      error,
      refreshCustomers
    }}>
      {children}
    </CustomerContext.Provider>
  );
};