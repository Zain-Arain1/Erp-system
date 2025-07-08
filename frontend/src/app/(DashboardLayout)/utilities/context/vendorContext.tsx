import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";

interface Vendor {
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
}

const VendorContext = createContext<VendorContextType>({
  vendors: [],
  addVendor: async () => ({} as Vendor),
  updateVendor: async () => {},
  deleteVendor: async () => {},
  isLoading: false,
  error: null,
  refreshVendors: async () => {},
});

export const useVendorContext = () => useContext(VendorContext);

export const VendorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const initialFetchDoneRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  // Add proper error handling for the fetch
const fetchVendors = useCallback(async () => {
  if (!isMountedRef.current) return;

  abortControllerRef.current?.abort();
  abortControllerRef.current = new AbortController();

  try {
    setIsLoading(true);
    setError(null);

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!baseUrl) throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");

    const res = await fetch(`${baseUrl}/api/vendors`, {
      signal: abortControllerRef.current.signal,
      headers: {
        'Cache-Control': 'no-cache'
      }
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to fetch vendors');
    }

    const data = await res.json();
    const mapped = data.map((vendor: any) => ({
      id: vendor._id,
      name: vendor.name || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      address: vendor.address || '',
      status: vendor.status || 'Active',
      company: vendor.company || '',
    }));

    if (isMountedRef.current) {
      setVendors(mapped);
    }
  } catch (error: any) {
    if (error.name !== 'AbortError' && isMountedRef.current) {
      console.error("Vendor fetch error:", error);
      setError(error.message || "Failed to load vendors");
    }
  } finally {
    if (isMountedRef.current) {
      setIsLoading(false);
    }
  }
}, []);

  // Initial fetch - runs only once
  useEffect(() => {
    if (!initialFetchDoneRef.current) {
      initialFetchDoneRef.current = true;
      fetchVendors();
    }
  }, [fetchVendors]);

  const addVendor = useCallback(async (vendor: Omit<Vendor, "id">): Promise<Vendor> => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendor),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || errorData.message || "Failed to add vendor");
      }

      const newVendor = await res.json();
      const vendorWithId: Vendor = {
        id: newVendor._id,
        name: newVendor.name || '',
        email: newVendor.email || '',
        phone: newVendor.phone || '',
        address: newVendor.address || '',
        status: newVendor.status || 'Active',
        company: newVendor.company || '',
      };

      setVendors((prev) => [...prev, vendorWithId]);
      return vendorWithId;
    } catch (error: any) {
      setError(error.message || "Failed to add vendor");
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateVendor = useCallback(async (id: string, updatedVendor: Partial<Vendor>) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendors/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedVendor),
      });

      if (!res.ok) throw new Error("Failed to update vendor");

      const updated = await res.json();
      setVendors((prev) =>
        prev.map((v) => (v.id === id ? { ...v, ...updated, id: updated._id } : v))
      );
    } catch (error: any) {
      setError(error.message || "Failed to update vendor");
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteVendor = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendors/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete vendor");

      setVendors((prev) => prev.filter((v) => v.id !== id));
    } catch (error: any) {
      setError(error.message || "Failed to delete vendor");
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshVendors = useCallback(async () => {
    await fetchVendors();
  }, [fetchVendors]);

  const contextValue = useMemo(() => ({
    vendors,
    addVendor,
    updateVendor,
    deleteVendor,
    isLoading,
    error,
    refreshVendors,
  }), [vendors, isLoading, error, addVendor, updateVendor, deleteVendor, refreshVendors]);

  return (
    <VendorContext.Provider value={contextValue}>
      {children}
    </VendorContext.Provider>
  );
};