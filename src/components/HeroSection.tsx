import { Link } from "react-router-dom";
import { FileText, GraduationCap, ChevronDown } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  const scrollToAbout = () => {
    document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="St. Mary's Campus" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-hero" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-6 animate-fade-in-up">
          Excellence in Education Since 1962
        </h1>
        
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <p className="font-display text-xl md:text-2xl text-secondary italic mb-3">
            "We Think We Can and Indeed We Can"
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-secondary">✦</span>
            <div className="w-24 h-0.5 bg-secondary/50" />
            <span className="text-secondary">✦</span>
          </div>
        </div>

        <p className="font-body text-lg md:text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
          St. Mary's High School provides a transformative educational experience that prepares students for success in college and beyond.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: "0.6s" }}>
          <Link
            to="/admissions"
            className="bg-secondary text-secondary-foreground px-8 py-4 rounded-xl font-body font-bold text-lg hover:opacity-90 transition-all hover:-translate-y-1 shadow-lg flex items-center justify-center gap-2"
          >
            <FileText className="w-5 h-5" />
            Apply Now
          </Link>
          <Link
            to="/about"
            className="bg-primary-foreground/10 text-primary-foreground border-2 border-primary-foreground/30 px-8 py-4 rounded-xl font-body font-bold text-lg hover:bg-primary-foreground/20 transition-all hover:-translate-y-1 flex items-center justify-center gap-2"
          >
            <GraduationCap className="w-5 h-5" />
            Learn More
          </Link>
        </div>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={scrollToAbout}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-primary-foreground/60 animate-bounce cursor-pointer"
      >
        <ChevronDown className="w-8 h-8" />
      </button>
    </section>
  );
};

export default HeroSection;
