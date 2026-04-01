import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ArrowRight, Loader2 } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { supabase } from "@/integrations/supabase/client";

const News = () => {
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("homepage_updates")
      .select("*")
      .eq("is_active", true)
      .order("display_order")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setUpdates(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="relative pt-20">
        <div className="h-64 md:h-80 relative overflow-hidden">
          <img src={heroBg} alt="Campus" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-hero flex items-center justify-center">
            <div className="text-center">
              <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-2">News & Events</h1>
              <p className="font-body text-primary-foreground/70 text-lg">Stay updated with the latest happenings</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : updates.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-lg">No news updates yet. Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {updates.map((item) => (
                <article
                  key={item.id}
                  className="bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 border border-border group"
                >
                  {item.image_url && (
                    <div className="h-56 overflow-hidden">
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  )}
                  <div className="p-6">
                    <p className="font-body text-sm text-secondary font-semibold mb-2">
                      {new Date(item.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    <h2 className="font-display text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">{item.title}</h2>
                    <p className="font-body text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default News;
