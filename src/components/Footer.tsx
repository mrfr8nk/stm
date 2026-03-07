import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Clock, Facebook, Twitter, Instagram, Youtube } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";

const Footer = () => {
  return (
    <footer className="bg-[hsl(212,100%,10%)] text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_30%,rgba(255,215,0,0.15),transparent_50%)]" />
      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="grid md:grid-cols-3 gap-8">
          {/* About Column */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <img src={schoolLogo} alt="St. Mary's" className="h-10 w-10 object-contain" />
              <h3 className="font-display text-xl font-bold text-[hsl(47,100%,50%)]">St. Mary's High School</h3>
            </div>
            <p className="font-body text-white/80 mb-6 leading-relaxed">
              Providing excellence in education since 1962. Our mission is to develop the whole person — mind, body, and spirit.
            </p>
            <div className="flex gap-3">
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-[hsl(47,100%,50%)] hover:text-[hsl(212,100%,15%)] transition-all duration-300 hover:-translate-y-1"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="font-display text-xl font-bold text-[hsl(47,100%,50%)] mb-4">Quick Links</h3>
            <ul className="font-body space-y-2">
              {[
                { label: "About Us", path: "/about" },
                { label: "Admissions", path: "/admissions" },
                { label: "Our Staff", path: "/staff" },
                { label: "News & Events", path: "/news" },
                { label: "Contact", path: "/contact" },
              ].map((link) => (
                <li key={link.path}>
                  <Link to={link.path} className="text-white/70 hover:text-[hsl(47,100%,50%)] transition-all">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="font-display text-xl font-bold text-[hsl(47,100%,50%)] mb-4">Contact Us</h3>
            <div className="font-body space-y-3">
              {[
                { icon: MapPin, text: "Harare, Chitungwiza Zengeza 1" },
                { icon: Phone, text: "+263 719 647 303" },
                { icon: Mail, text: "info@stmaryshs.edu" },
                { icon: Clock, text: "Mon-Fri: 8:00 AM - 4:30 PM" },
              ].map(({ icon: Icon, text }, i) => (
                <p key={i} className="flex items-start gap-2 text-white/70">
                  <Icon className="w-4 h-4 mt-1 text-[hsl(197,71%,73%)] flex-shrink-0" />
                  {text}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mt-12 pt-8 border-t border-white/10">
          <p className="font-body text-white/60">© {new Date().getFullYear()} St. Mary's High School. All rights reserved.</p>
          <p className="font-body text-white/40 mt-1 text-sm">
            Made with ❤️ by Darrell Mucheri
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
