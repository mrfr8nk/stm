import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, GraduationCap, LogIn } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";

const navItems = [
  { label: "Home", path: "/" },
  { label: "About", path: "/about" },
  { label: "Admissions", path: "/admissions" },
  { label: "Staff", path: "/staff" },
  { label: "Gallery", path: "/gallery" },
  { label: "News", path: "/news" },
  { label: "Contact", path: "/contact" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-sm transition-all duration-300">
      <div className="container mx-auto px-4 flex items-center justify-between h-20">
        <Link to="/" className="flex items-center gap-3">
          <img src={schoolLogo} alt="St. Mary's Logo" className="h-12 w-12 object-contain" />
          <span className="font-display text-xl font-bold text-primary">St. Mary's</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`font-body font-medium transition-colors hover:text-secondary ${
                location.pathname === item.path ? "text-secondary" : "text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/login"
            className="border border-primary text-primary px-4 py-2 rounded-lg font-body font-semibold hover:bg-primary hover:text-primary-foreground transition-all flex items-center gap-2 text-sm"
          >
            <LogIn className="w-4 h-4" />
            Portal Login
          </Link>
          <Link
            to="/contact"
            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-body font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 text-sm"
          >
            <GraduationCap className="w-4 h-4" />
            Apply Now
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-foreground">
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <nav className="md:hidden bg-card border-t border-border animate-fade-in">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`font-body font-medium py-2 ${
                  location.pathname === item.path ? "text-secondary" : "text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/login"
              onClick={() => setIsOpen(false)}
              className="border border-primary text-primary px-5 py-2.5 rounded-lg font-body font-semibold text-center mt-2 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" /> Portal Login
            </Link>
            <Link
              to="/contact"
              onClick={() => setIsOpen(false)}
              className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-body font-semibold text-center"
            >
              Apply Now
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
};

export default Navbar;
