// Define the Customer interface
interface Customer {
    id: number;
    name: string;
    email: string;
    phone: string;
    address: string;
    status: "Active" | "Inactive";
  }
  
  // Mock customer data
  export const customers: Customer[] = [
    {
      id: 1,
      name: "John Doe",
      email: "john.doe@example.com",
      phone: "123-456-7890",
      address: "123 Main St, City, Country",
      status: "Active",
    },
    {
      id: 2,
      name: "Jane Smith",
      email: "jane.smith@example.com",
      phone: "987-654-3210",
      address: "456 Elm St, City, Country",
      status: "Inactive",
    },
    {
      id: 3,
      name: "Alice Johnson",
      email: "alice.johnson@example.com",
      phone: "555-123-4567",
      address: "789 Oak St, City, Country",
      status: "Active",
    },
  ];
  
  export default customers;