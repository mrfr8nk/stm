import { useEffect, useState } from "react";
import defaultHeadmasterImg from "@/assets/headmaster.jpg";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { supabase } from "@/integrations/supabase/client";

const HeadmasterSection = () => {
  const { ref, isVisible } = useScrollReveal();
  const [headmasterImage, setHeadmasterImage] = useState<string>("");
  const [headmasterName, setHeadmasterName] = useState<string>("Mr. Nyabako");
  const [headmasterTitle, setHeadmasterTitle] = useState<string>("Head Master");
  const [headmasterQuote, setHeadmasterQuote] = useState<string>("");

  useEffect(() => {
    const fetchHeadmasterSettings = async () => {
      const keys = ["headmaster_image", "headmaster_name", "headmaster_title", "headmaster_quote"];
      const { data } = await supabase.from("system_settings").select("*").in("key", keys);
      if (data) {
        data.forEach((item: any) => {
          if (item.key === "headmaster_image" && item.value) setHeadmasterImage(item.value);
          if (item.key === "headmaster_name" && item.value) setHeadmasterName(item.value);
          if (item.key === "headmaster_title" && item.value) setHeadmasterTitle(item.value);
          if (item.key === "headmaster_quote" && item.value) setHeadmasterQuote(item.value);
        });
      }
    };
    fetchHeadmasterSettings();
  }, []);

  const defaultQuote = `St. Mary's High School has been and will remain a fountain of wisdom, and it is the wise who will drink from this great fountain of wisdom.

Our success as a school is an outcome of an ever-deepening culture of industry and commitment to study on the part of our learners, complimented by a hard-working team of tried and tested professionals.

As we stand guided by our motto: "We Think We Can and Indeed We Can" — I invite you to join our community where excellence is not just a goal, but a way of life.`;

  const displayQuote = headmasterQuote || defaultQuote;
  const paragraphs = displayQuote.split("\n\n").filter(Boolean);

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
              src={headmasterImage || defaultHeadmasterImg}
              alt={`${headmasterName} - ${headmasterTitle}`}
              className="w-full rounded-2xl shadow-card-hover object-cover aspect-square"
            />
            <div className="absolute -top-4 -left-4 text-7xl font-display text-secondary opacity-40 select-none">"</div>
          </div>

          <div className={`transition-all duration-700 delay-400 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <h3 className="font-display text-2xl font-bold text-primary mb-1">{headmasterName}</h3>
            <p className="font-body text-secondary font-semibold mb-6">{headmasterTitle}</p>

            <blockquote className="font-body text-muted-foreground space-y-4 border-l-4 border-secondary pl-6">
              {paragraphs.map((p, i) => (
                <p key={i} className={i === 0 ? "italic leading-relaxed" : "leading-relaxed"}>
                  {p}
                </p>
              ))}
            </blockquote>

            <div className="mt-6 font-body">
              <p className="font-semibold text-foreground">{headmasterName}</p>
              <p className="text-sm text-muted-foreground">{headmasterTitle}, St. Mary's High School</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeadmasterSection;
