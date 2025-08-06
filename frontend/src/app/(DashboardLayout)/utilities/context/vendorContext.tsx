import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";

export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: "Active" | "Inactive";
  company?: string;
}

interface VendorContextType {
  vendors: Vendor[];
  addVendor: (vendor: Omit<Vendor, "id">) => Promise<Vendor>;
  updateVendor: (id: string, updatedVendor: Partial<Vendor>) => Promise<void>;
  deleteVendor: (id: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  refreshVendors: () => Promise<void>;
  lastRefresh: Date | null;
}

const VendorContext = createContext<VendorContextType | undefined>(undefined);

export const useVendorContext = () => {
  const context = useContext(VendorContext);
  if (!context) {
    throw new Error('useVendorContext must be used within a VendorProvider');
  }
  return context;
};

const handleApiError = (error: any, setError: (error: string | null) => void) => {
  if (error.name === 'AbortError') {
    console.log('Request was aborted');
    return;
  }
  
  const errorMessage = error.response?.data?.message || 
                      error.message || 
                      'An unexpected error occurred';
  setError(errorMessage);
  throw new Error(errorMessage);
};

export const VendorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchVendors = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Fetching vendors from:', `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendors`);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendors`, {
        signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch vendors. Status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      
      const transformedVendors = data.map((vendor: any) => ({
        id: vendor._id || vendor.id,
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        address: vendor.address,
        status: vendor.status || 'Active',
        company: vendor.company || '',
      }));

      console.log('Transformed Vendors:', transformedVendors);

      setVendors(transformedVendors);
      setLastRefresh(new Date());
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching vendors:', error);
        setError(error.message || 'Failed to fetch vendors');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetchVendors(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchVendors]);

  const addVendor = useCallback(async (vendor: Omit<Vendor, "id">): Promise<Vendor> => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setIsLoading(true);
      setError(null);

      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!baseUrl) {
        throw new Error('Missing API base URL');
      }

      const response = await fetch(`${baseUrl}/api/vendors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify(vendor),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to add vendor. Status: ${response.status}`);
      }

      const newVendor = await response.json();
      const vendorWithId: Vendor = {
        id: newVendor._id || newVendor.id,
        name: newVendor.name || vendor.name,
        email: newVendor.email || vendor.email,
        phone: newVendor.phone || vendor.phone,
        address: newVendor.address || vendor.address,
        status: newVendor.status || vendor.status || 'Active',
        company: newVendor.company || vendor.company,
      };

      setVendors(prev => [...prev, vendorWithId]);
      setLastRefresh(new Date());

      return vendorWithId;
    } catch (error: any) {
      handleApiError(error, setError);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateVendor = useCallback(async (id: string, updatedVendor: Partial<Vendor>) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setIsLoading(true);
      setError(null);

      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!baseUrl) {
        throw new Error('Missing API base URL');
      }

      const response = await fetch(`${baseUrl}/api/vendors/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify(updatedVendor),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update vendor. Status: ${response.status}`);
      }

      const updated = await response.json();
      setVendors(prev => prev.map(v => v.id === id ? { ...v, ...updated, id: updated._id || updated.id } : v));
      setLastRefresh(new Date());
    } catch (error: any) {
      handleApiError(error, setError);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteVendor = useCallback(async (id: string) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setIsLoading(true);
      setError(null);

      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!baseUrl) {
        throw new Error('Missing API base URL');
      }

      const response = await fetch(`${baseUrl}/api/vendors/${id}`, {
        method: "DELETE",
        headers: {
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete vendor. Status: ${response.status}`);
      }

      setVendors(prev => prev.filter(v => v.id !== id));
      setLastRefresh(new Date());
    } catch (error: any) {
      handleApiError(error, setError);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshVendors = useCallback(async () => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    await fetchVendors(controller.signal);
  }, [fetchVendors]);

  const contextValue = useMemo(() => ({
    vendors,
    addVendor,
    updateVendor,
    deleteVendor,
    isLoading,
    error,
    refreshVendors,
    lastRefresh,
  }), [vendors, isLoading, error, addVendor, updateVendor, deleteVendor, refreshVendors, lastRefresh]);

  return (
    <VendorContext.Provider value={contextValue}>
      {children}
    </VendorContext.Provider>
  );
};