import { useEffect, useState } from "react";
import headmasterImg from "@/assets/headmaster.jpg";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { supabase } from "@/integrations/supabase/client";

interface HeadmasterData {
  name: string;
  title: string;
  image_url: string | null;
  quote: string;
  message: string;
  closing: string;
}

const defaultHeadmaster: HeadmasterData = {
  name: "Mr. Nyabako",
  title: "Head Master",
  image_url: null,
  quote: "St. Mary's High School has been and will remain a fountain of wisdom, and it is the wise who will drink from this great fountain of wisdom.",
  message: "Our success as a school is an outcome of an ever-deepening culture of industry and commitment to study on the part of our learners, complimented by a hard-working team of tried and tested professionals.",
  closing: 'As we stand guided by our motto: "We Think We Can and Indeed We Can" — I invite you to join our community where excellence is not just a goal, but a way of life.',
};

const HeadmasterSection = () => {
  const { ref, isVisible } = useScrollReveal();
  const [headmaster, setHeadmaster] = useState<HeadmasterData>(defaultHeadmaster);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHeadmaster = async () => {
      const { data } = await supabase
        .from("school_settings")
        .select("setting_value")
        .eq("setting_key", "headmaster")
        .single();
      
      if (data?.setting_value) {
        setHeadmaster({ ...defaultHeadmaster, ...data.setting_value });
      }
      setLoading(false);
    };
    fetchHeadmaster();
  }, []);

  // Use database image if available, otherwise fallback to static import
  const imageUrl = headmaster.image_url || headmasterImg;

  if (loading) {
    return (
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <div className="animate-pulse max-w-5xl mx-auto">
            <div className="h-8 bg-muted-foreground/10 rounded w-1/3 mx-auto mb-8"></div>
            <div className="grid md:grid-cols-[300px_1fr] gap-10">
              <div className="w-full aspect-square bg-muted-foreground/10 rounded-2xl"></div>
              <div className="space-y-4">
                <div className="h-6 bg-muted-foreground/10 rounded w-1/4"></div>
                <div className="h-4 bg-muted-foreground/10 rounded w-1/6"></div>
                <div className="h-20 bg-muted-foreground/10 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-muted">
      <div className="container mx-auto px-4" ref={ref}>
        <div className={`text-center mb-12 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">A Fountain of Wisdom</h2>
          <div className="w-16 h-1 bg-secondary mx-auto rounded-full" />
        </div>

        <div className="grid md:grid-cols-[300px_1fr] gap-10 items-start max-w-5xl mx-auto">
          <div className={`relative transition-all duration-700 delay-200 ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}>
            <img
              src={imageUrl}
              alt={`${headmaster.name} - ${headmaster.title}`}
              className="w-full rounded-2xl shadow-card-hover object-cover aspect-square"
            />
            <div className="absolute -top-4 -left-4 text-7xl font-display text-secondary opacity-40 select-none">"</div>
          </div>

          <div className={`transition-all duration-700 delay-400 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <h3 className="font-display text-2xl font-bold text-primary mb-1">{headmaster.name}</h3>
            <p className="font-body text-secondary font-semibold mb-6">{headmaster.title}</p>

            <blockquote className="font-body text-muted-foreground space-y-4 border-l-4 border-secondary pl-6">
              {headmaster.quote && (
                <p className="italic leading-relaxed">
                  {headmaster.quote}
                </p>
              )}
              {headmaster.message && (
                <p className="leading-relaxed">
                  {headmaster.message}
                </p>
              )}
              {headmaster.closing && (
                <p className="leading-relaxed" dangerouslySetInnerHTML={{ 
                  __html: headmaster.closing.replace(
                    /"([^"]+)"/g, 
                    '<strong>"$1"</strong>'
                  ) 
                }} />
              )}
            </blockquote>

            <div className="mt-6 font-body">
              <p className="font-semibold text-foreground">{headmaster.name}</p>
              <p className="text-sm text-muted-foreground">{headmaster.title}, St. Mary's High School</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeadmasterSection;
