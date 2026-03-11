import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mail, User } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const GallerySection = () => {
  const [staff, setStaff] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const { ref, isVisible } = useScrollReveal();

  useEffect(() => {
    supabase
      .from("staff_gallery")
      .select("*")
      .eq("is_active", true)
      .order("display_order")
      .order("created_at")
      .limit(6)
      .then(({ data }) => setStaff(data || []));
  }, []);

  const hasStaff = staff.length > 0;

  return (
    <section className="py-20 bg-muted">
      <div className="container mx-auto px-4" ref={ref}>
        <div className={`text-center mb-12 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            {hasStaff ? "Meet Our Faculty" : "School Environment"}
          </h2>
          <div className="w-16 h-1 bg-secondary mx-auto rounded-full" />
          {hasStaff && (
            <p className="font-body text-muted-foreground mt-3 max-w-xl mx-auto">
              Our dedicated team of professionals is committed to providing excellence in education
            </p>
          )}
        </div>

        {hasStaff ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {staff.map((member, i) => (
              <div
                key={member.id}
                className={`bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover hover:-translate-y-2 transition-all duration-500 border border-border group ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
                style={{ transitionDelay: isVisible ? `${200 + i * 100}ms` : "0ms" }}
              >
                <div className="relative h-64 overflow-hidden">
                  {member.category === "admin" && (
                    <span className="absolute top-3 right-3 z-10 bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-xs font-body font-bold">
                      {member.position}
                    </span>
                  )}
                  {member.image_url ? (
                    <img src={member.image_url} alt={member.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <User className="w-16 h-16 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div className="p-5 text-center">
                  <h3 className="font-display text-lg font-bold text-foreground mb-1">{member.name}</h3>
                  <p className="font-body text-accent-foreground font-semibold text-sm mb-1">{member.position}</p>
                  <p className="font-body text-muted-foreground text-sm mb-3">{member.subject || member.department}</p>
                  <div className="flex justify-center gap-2">
                    {member.email && (
                      <a href={`mailto:${member.email}`} className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-all">
                        <Mail className="w-4 h-4" />
                      </a>
                    )}
                    {member.bio && (
                      <button onClick={() => setSelectedStaff(member)} className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-all">
                        <User className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground font-body">Staff gallery coming soon</p>
        )}
      </div>

      {/* Staff Modal */}
      {selectedStaff && (
        <div className="fixed inset-0 z-[100] bg-foreground/80 flex items-center justify-center p-4" onClick={() => setSelectedStaff(null)}>
          <div className="bg-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-8">
              <div className="flex items-start gap-6 mb-6 flex-col sm:flex-row">
                {selectedStaff.image_url ? (
                  <img src={selectedStaff.image_url} alt={selectedStaff.name} className="w-28 h-28 rounded-full object-cover border-4 border-muted" />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-muted flex items-center justify-center border-4 border-border">
                    <User className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <h3 className="font-display text-2xl font-bold text-foreground">{selectedStaff.name}</h3>
                  <p className="font-body text-accent-foreground font-semibold">{selectedStaff.position}</p>
                  {selectedStaff.department && (
                    <span className="inline-block bg-muted px-3 py-1 rounded-full text-sm font-body text-muted-foreground mt-2">{selectedStaff.department}</span>
                  )}
                </div>
              </div>
              {selectedStaff.bio && <p className="font-body text-muted-foreground mb-6 leading-relaxed">{selectedStaff.bio}</p>}
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                {selectedStaff.education && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5"><span className="text-primary text-sm">🎓</span></div>
                    <div><p className="font-body font-semibold text-foreground text-sm">Education</p><p className="font-body text-muted-foreground text-sm">{selectedStaff.education}</p></div>
                  </div>
                )}
                {selectedStaff.experience && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5"><span className="text-primary text-sm">💼</span></div>
                    <div><p className="font-body font-semibold text-foreground text-sm">Experience</p><p className="font-body text-muted-foreground text-sm">{selectedStaff.experience}</p></div>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                {selectedStaff.email && (
                  <a href={`mailto:${selectedStaff.email}`} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-body font-semibold text-sm hover:opacity-90 transition-opacity">
                    <Mail className="w-4 h-4" /> Email
                  </a>
                )}
                <button onClick={() => setSelectedStaff(null)} className="flex items-center gap-2 bg-muted text-foreground px-4 py-2 rounded-lg font-body font-semibold text-sm hover:bg-border transition-colors">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default GallerySection;
