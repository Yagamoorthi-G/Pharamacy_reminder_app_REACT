import { Link } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {
  return (
    <div className="navbar">
      <Link to="/" className="nav-link">Home</Link>
      <Link to="/add" className="nav-link">Add</Link>
      <Link to="/customers" className="nav-link">Customers</Link>
      <Link to="/renewals" className="nav-link">Renewals</Link>
      <Link to="/summary" className="nav-link">Summary</Link>
    </div>
  );
}