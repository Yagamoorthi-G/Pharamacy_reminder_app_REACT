import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import AddCustomer from "./pages/AddCustomer";
import CustomerList from "./pages/CustomerList";
import EditCustomer from "./pages/EditCustomer";
import RenewalStack from "./pages/RenewalStack";
import PurchaseSummary from "./pages/PurchaseSummary";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/add" element={<AddCustomer />} />
        <Route path="/customers" element={<CustomerList />} />
        <Route path="/edit/:id" element={<EditCustomer />} />
        <Route path="/renewals" element={<RenewalStack />} />
        <Route path="/summary" element={<PurchaseSummary />} />
      </Routes>
    </BrowserRouter>
  );
}
