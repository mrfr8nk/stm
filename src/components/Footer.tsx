import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Clock, Facebook, Twitter, Instagram, Youtube } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-gradient-footer text-primary-foreground relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_30%,rgba(255,215,0,0.15),transparent_50%)]" />
      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="grid md:grid-cols-3 gap-8">
          {/* About Column */}
          <div className="bg-primary-foreground/5 backdrop-blur-sm rounded-xl p-6 border border-primary-foreground/10">
            <h3 className="font-display text-xl font-bold text-secondary mb-4">St. Mary's High School</h3>
            <p className="font-body opacity-90 mb-6 leading-relaxed">
              Providing excellence in education since 1962. Our mission is to develop the whole person — mind, body, and spirit.
            </p>
            <div className="flex gap-3">
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-10 h-10 rounded-lg bg-primary-foreground/10 flex items-center justify-center hover:bg-secondary hover:text-secondary-foreground transition-all duration-300 hover:-translate-y-1"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-primary-foreground/5 backdrop-blur-sm rounded-xl p-6 border border-primary-foreground/10">
            <h3 className="font-display text-xl font-bold text-secondary mb-4">Quick Links</h3>
            <ul className="font-body space-y-2">
              {[
                { label: "About Us", path: "/about" },
                { label: "News & Events", path: "/news" },
                { label: "Contact", path: "/contact" },
              ].map((link) => (
                <li key={link.path}>
                  <Link to={link.path} className="opacity-80 hover:opacity-100 hover:text-secondary transition-all">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="bg-primary-foreground/5 backdrop-blur-sm rounded-xl p-6 border border-primary-foreground/10">
            <h3 className="font-display text-xl font-bold text-secondary mb-4">Contact Us</h3>
            <div className="font-body space-y-3">
              {[
                { icon: MapPin, text: "Harare, Chitungwiza Zengeza 1" },
                { icon: Phone, text: "+263 719 647 303" },
                { icon: Mail, text: "info@stmaryshs.edu" },
                { icon: Clock, text: "Mon-Fri: 8:00 AM - 4:30 PM" },
              ].map(({ icon: Icon, text }, i) => (
                <p key={i} className="flex items-start gap-2 opacity-80">
                  <Icon className="w-4 h-4 mt-1 text-accent flex-shrink-0" />
                  {text}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mt-12 pt-8 border-t border-primary-foreground/10">
          <p className="font-body opacity-70">© 2025 St. Mary's High School. All rights reserved.</p>
          <p className="font-body opacity-50 mt-1 text-sm">
            Made with ❤️ by Darrell Mucheri
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
