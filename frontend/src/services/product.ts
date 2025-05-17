export interface Product {
    _id?: string;
    name: string;
    sku: string;
    category: string;
    price: number;
    quantity: number;
    status: "In Stock" | "Low Stock" | "Out of Stock";
    image?: string;
}
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  
  export const getProducts = async (): Promise<Product[]> => {
    const response = await fetch(`${API_URL}/products`);
    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }
    return response.json();
  };
  
  export const createProduct = async (product: Omit<Product, '_id'>): Promise<Product> => {
    const response = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    });
    if (!response.ok) {
      throw new Error('Failed to create product');
    }
    return response.json();
  };
  
  export const updateProduct = async (id: string, product: Omit<Product, '_id'>): Promise<Product> => {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    });
    if (!response.ok) {
      throw new Error('Failed to update product');
    }
    return response.json();
  };
  
  export const deleteProduct = async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete product');
    }
  };