import { useEffect, useState } from "react";
import { ArrowRight, Calendar, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const NewsSection = () => {
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error: err } = await supabase
          .from("homepage_updates")
          .select("*")
          .eq("is_active", true)
          .order("display_order")
          .order("created_at", { ascending: false })
          .limit(6);

        if (err) {
          console.error("NewsSection fetch error:", err);
          setError(true);
        } else {
          setUpdates(data || []);
        }
      } catch (e) {
        console.error("NewsSection error:", e);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        </div>
      </section>
    );
  }

  if (error || updates.length === 0) return null;

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14 animate-fade-in">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Latest News & Updates
          </h2>
          <div className="w-20 h-1 bg-secondary mx-auto rounded-full" />
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
            Stay informed with the latest happenings at St. Mary's High School
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {updates.map((item, i) => (
            <div
              key={item.id}
              className="group bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-500 border border-border animate-fade-in"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {item.image_url ? (
                <div className="h-48 overflow-hidden">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="h-2 bg-gradient-to-r from-primary to-secondary" />
              )}
              <div className="p-5">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">
                    {new Date(item.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-4">
                  {item.description}
                </p>
                <Link
                  to="/news"
                  className="text-primary font-semibold text-sm inline-flex items-center gap-1 hover:gap-2 transition-all"
                >
                  Read More <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12 animate-fade-in" style={{ animationDelay: "600ms" }}>
          <Link
            to="/news"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-lg"
          >
            View All News <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default NewsSection;
