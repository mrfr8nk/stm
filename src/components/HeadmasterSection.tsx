import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import defaultHeadmasterImg from "@/assets/headmaster.jpg";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const HeadmasterSection = () => {
  const { ref, isVisible } = useScrollReveal();
  const [headmaster, setHeadmaster] = useState<any>(null);

  useEffect(() => {
    // Try to load headmaster from staff_gallery
    supabase
      .from("staff_gallery")
      .select("*")
      .eq("is_active", true)
      .or("position.ilike.%head master%,position.ilike.%headmaster%,position.ilike.%head%master%")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setHeadmaster(data);
      });
  }, []);

  const imgSrc = headmaster?.image_url || defaultHeadmasterImg;
  const name = headmaster?.name || "Mr. Nyabako";
  const title = headmaster?.position || "Head Master";

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
              src={imgSrc}
              alt={`${name} - ${title}`}
              className="w-full rounded-2xl shadow-card-hover object-cover aspect-square"
            />
            <div className="absolute -top-4 -left-4 text-7xl font-display text-secondary opacity-40 select-none">"</div>
          </div>

          <div className={`transition-all duration-700 delay-400 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <h3 className="font-display text-2xl font-bold text-primary mb-1">{name}</h3>
            <p className="font-body text-secondary font-semibold mb-6">{title}</p>

            <blockquote className="font-body text-muted-foreground space-y-4 border-l-4 border-secondary pl-6">
              {headmaster?.bio ? (
                headmaster.bio.split("\n").filter(Boolean).map((p: string, i: number) => (
                  <p key={i} className="leading-relaxed">{p}</p>
                ))
              ) : (
                <>
                  <p className="italic leading-relaxed">
                    St. Mary's High School has been and will remain a fountain of wisdom, and it is the wise who will drink from this great fountain of wisdom.
                  </p>
                  <p className="leading-relaxed">
                    Our success as a school is an outcome of an ever-deepening culture of industry and commitment to study on the part of our learners, complimented by a hard-working team of tried and tested professionals.
                  </p>
                  <p className="leading-relaxed">
                    As we stand guided by our motto: <strong>"We Think We Can and Indeed We Can"</strong> — I invite you to join our community where excellence is not just a goal, but a way of life.
                  </p>
                </>
              )}
            </blockquote>

            <div className="mt-6 font-body">
              <p className="font-semibold text-foreground">{name}</p>
              <p className="text-sm text-muted-foreground">{title}, St. Mary's High School</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeadmasterSection;
