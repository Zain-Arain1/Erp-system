/* This code snippet is creating a React context and provider for managing customer data in a
TypeScript React application. Here's a breakdown of what each part of the code is doing: */
import React, { createContext, useContext, useState, useEffect } from "react";

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
}

const CustomerContext = createContext<CustomerContextType>({
  customers: [],
  addCustomer: async () => {},
  updateCustomer: async () => {},
  deleteCustomer: async () => {},
  isLoading: false,
});

export const useCustomerContext = () => useContext(CustomerContext);

export const CustomerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load customers from backend on mount
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/customers`);
        if (!res.ok) throw new Error('Failed to fetch customers');
        
        const data = await res.json();

        // Map _id to id for frontend
        const mapped = data.map((customer: any) => ({
          ...customer,
          id: customer._id,
        }));

        setCustomers(mapped);
      } catch (error) {
        console.error("Failed to fetch customers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Add a new customer (API + state)
  const addCustomer = async (customer: Omit<Customer, "id">) => {
    try {
      setIsLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customer),
      });

      if (!res.ok) throw new Error('Failed to add customer');
      
      const newCustomer = await res.json();
      setCustomers((prev) => [...prev, { ...newCustomer, id: newCustomer._id }]);
    } catch (error) {
      console.error("Failed to add customer:", error);
      throw error; // Re-throw to handle in the component
    } finally {
      setIsLoading(false);
    }
  };

  // Update an existing customer (API + state)
  const updateCustomer = async (id: string, updatedCustomer: Partial<Customer>) => {
    try {
      setIsLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedCustomer),
      });

      if (!res.ok) throw new Error('Failed to update customer');
      
      const updated = await res.json();
      setCustomers((prev) =>
        prev.map((cust) => (cust.id === id ? { ...cust, ...updated } : cust))
      );
    } catch (error) {
      console.error("Failed to update customer:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a customer (API + state)
  const deleteCustomer = async (id: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/customers/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error('Failed to delete customer');
      
      setCustomers((prev) => prev.filter((cust) => cust.id !== id));
    } catch (error) {
      console.error("Failed to delete customer:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CustomerContext.Provider value={{ 
      customers, 
      addCustomer, 
      updateCustomer, 
      deleteCustomer,
      isLoading 
    }}>
      {children}
    </CustomerContext.Provider>
  );
};