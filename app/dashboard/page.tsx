import Nav from "../components/Nav";
import Footer from "../components/Footer";
import Dashboard from "../components/Dashboard";

export const metadata = { title: "Assay — dashboard" };

export default function DashboardPage() {
  return (
    <main>
      <Nav />
      <Dashboard />
      <Footer />
    </main>
  );
}
