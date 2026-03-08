import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import HeadmasterSection from "@/components/HeadmasterSection";
import AcademicsSection from "@/components/AcademicsSection";
import GallerySection from "@/components/GallerySection";
import NewsSection from "@/components/NewsSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && role) {
      navigate(`/${role}`, { replace: true });
    }
  }, [user, role, loading, navigate]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <AboutSection />
      <HeadmasterSection />
      <AcademicsSection />
      <GallerySection />
      <NewsSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
