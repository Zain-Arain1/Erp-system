import CustomerLedger from "@/app/(DashboardLayout)/utilities/customer/CustomerLedger";
import { customers } from "@/app/(DashboardLayout)/utilities/customer/customers"; // Import mock data

interface Params {
  id: string;
}

const CustomerLedgerPage = ({ params }: { params: Params }) => {
  // Find the customer by ID
  const customer = customers.find((c) => c.id === parseInt(params.id));

  // If customer not found, show an error message
  if (!customer) {
    return <div>Customer not found</div>;
  }

  // Render the ledger interface
  return <CustomerLedger customer={customer} />;
};

export default CustomerLedgerPage;