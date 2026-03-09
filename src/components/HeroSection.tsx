import { Link } from "react-router-dom";
import { FileText, GraduationCap, ChevronDown } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import schoolLogo from "@/assets/school-logo.png";

const HeroSection = () => {
  const scrollToAbout = () => {
    document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="St. Mary's Campus" className="w-full h-full object-cover" fetchPriority="high" decoding="async" />
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(212,100%,10%/0.95)] via-[hsl(212,100%,20%/0.85)] to-[hsl(212,100%,15%/0.92)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto pt-20">
        {/* Logo */}
        <div className="mb-6 animate-fade-in-up">
          <img src={schoolLogo} alt="St. Mary's High School Crest" className="h-28 md:h-36 mx-auto drop-shadow-2xl" fetchPriority="high" decoding="async" />
        </div>

        <h1 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          St. Mary's High School
        </h1>

        <div className="mb-6 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
          <p className="font-display text-lg md:text-xl text-[hsl(47,100%,70%)] italic mb-3">
            "We Think We Can and Indeed We Can"
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-[1px] bg-[hsl(47,100%,50%/0.5)]" />
            <span className="text-[hsl(47,100%,50%)] text-xs tracking-[4px] uppercase font-body font-semibold">Excellence & Integrity</span>
            <div className="w-12 h-[1px] bg-[hsl(47,100%,50%/0.5)]" />
          </div>
        </div>

        <p className="font-body text-base md:text-lg text-white/80 mb-8 max-w-2xl mx-auto animate-fade-in-up leading-relaxed" style={{ animationDelay: "0.4s" }}>
          Founded in 1962, St. Mary's provides a transformative educational experience rooted in Christian values, academic excellence, and the spirit of Ubuntu.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: "0.55s" }}>
          <Link
            to="/admissions"
            className="bg-[hsl(47,100%,50%)] text-[hsl(212,100%,15%)] px-8 py-4 rounded-xl font-body font-bold text-lg hover:bg-[hsl(47,100%,55%)] transition-all hover:-translate-y-1 shadow-lg flex items-center justify-center gap-2"
          >
            <FileText className="w-5 h-5" />
            Apply Now
          </Link>
          <Link
            to="/about"
            className="bg-white/10 text-white border-2 border-white/25 px-8 py-4 rounded-xl font-body font-bold text-lg hover:bg-white/20 transition-all hover:-translate-y-1 backdrop-blur-sm flex items-center justify-center gap-2"
          >
            <GraduationCap className="w-5 h-5" />
            Learn More
          </Link>
        </div>

        {/* Stats strip */}
        <div className="mt-12 grid grid-cols-3 gap-4 max-w-lg mx-auto animate-fade-in-up" style={{ animationDelay: "0.7s" }}>
          {[
            { value: "63+", label: "Years" },
            { value: "1,261", label: "Students" },
            { value: "55", label: "Teachers" },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="font-display text-2xl md:text-3xl font-bold text-[hsl(47,100%,50%)]">{s.value}</p>
              <p className="font-body text-xs text-white/60 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={scrollToAbout}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 animate-bounce cursor-pointer"
      >
        <ChevronDown className="w-8 h-8" />
      </button>
    </section>
  );
};

export default HeroSection;
