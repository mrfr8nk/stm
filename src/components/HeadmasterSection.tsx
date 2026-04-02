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

        <div className={`relative max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-card-hover transition-all duration-700 delay-200 ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}>
          {/* Background image */}
          <img
            src={imgSrc}
            alt={`${name} - ${title}`}
            className="w-full h-[500px] md:h-[550px] object-cover"
          />

          {/* Overlay with message */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20 flex flex-col justify-end p-6 md:p-10">
            <div className="absolute top-6 left-6 text-7xl font-display text-white/30 select-none">"</div>

            <blockquote className="font-body text-white/90 space-y-3 max-w-3xl">
              {headmaster?.bio ? (
                headmaster.bio.split("\n").filter(Boolean).map((p: string, i: number) => (
                  <p key={i} className="leading-relaxed text-sm md:text-base">{p}</p>
                ))
              ) : (
                <>
                  <p className="italic leading-relaxed text-sm md:text-base">
                    St. Mary's High School has been and will remain a fountain of wisdom, and it is the wise who will drink from this great fountain of wisdom.
                  </p>
                  <p className="leading-relaxed text-sm md:text-base">
                    Our success as a school is an outcome of an ever-deepening culture of industry and commitment to study on the part of our learners, complimented by a hard-working team of tried and tested professionals.
                  </p>
                  <p className="leading-relaxed text-sm md:text-base">
                    As we stand guided by our motto: <strong>"We Think We Can and Indeed We Can"</strong> — I invite you to join our community where excellence is not just a goal, but a way of life.
                  </p>
                </>
              )}
            </blockquote>

            <div className="mt-4 font-body">
              <p className="font-semibold text-white">{name}</p>
              <p className="text-sm text-white/70">{title}, St. Mary's High School</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeadmasterSection;
