import { Link } from "react-router-dom";
import { FileText, TrendingUp } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const CTASection = () => {
  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-cta" />
      </div>
      <div className="relative z-10 container mx-auto px-4 text-center">
        <h2 className="font-display text-3xl md:text-5xl font-bold text-primary-foreground mb-6">
          Ready to Join the St. Mary's Family?
        </h2>
        <p className="font-body text-lg text-primary-foreground/80 max-w-xl mx-auto mb-10">
          Applications for the 2025-2026 school year are now being accepted.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/admissions"
            className="bg-secondary text-secondary-foreground px-8 py-4 rounded-xl font-body font-bold text-lg hover:opacity-90 transition-all hover:-translate-y-1 shadow-lg flex items-center justify-center gap-2"
          >
            <FileText className="w-5 h-5" />
            Apply Now
          </Link>
          <Link
            to="/admissions#pass-rates"
            className="bg-primary-foreground/10 text-primary-foreground border-2 border-primary-foreground/30 px-8 py-4 rounded-xl font-body font-bold text-lg hover:bg-primary-foreground/20 transition-all hover:-translate-y-1 flex items-center justify-center gap-2"
          >
            <TrendingUp className="w-5 h-5" />
            View Pass Rates
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
