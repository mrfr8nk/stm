import { FlaskConical, Paintbrush, TrendingUp } from "lucide-react";

const programs = [
  {
    icon: FlaskConical,
    title: "Science",
    description: "Our STEM programs prepare students for careers in science, technology, engineering, and mathematics with state-of-the-art labs.",
  },
  {
    icon: Paintbrush,
    title: "Arts & Humanities",
    description: "From visual arts to performing arts and literature, our comprehensive humanities program fosters creativity and critical thinking.",
  },
  {
    icon: TrendingUp,
    title: "Commercial Sciences",
    description: "Our Commercial Sciences program follows the ZIMSEC curriculum, preparing students for careers in business, accounting, and economics.",
  },
];

const AcademicsSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">Our Academic Programs</h2>
          <div className="w-16 h-1 bg-secondary mx-auto rounded-full" />
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {programs.map((program) => (
            <div
              key={program.title}
              className="bg-card rounded-2xl p-8 shadow-card hover:shadow-card-hover hover:-translate-y-2 transition-all duration-300 border border-border group"
            >
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-secondary/20 transition-colors">
                <program.icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mb-3">{program.title}</h3>
              <p className="font-body text-muted-foreground leading-relaxed">{program.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AcademicsSection;
