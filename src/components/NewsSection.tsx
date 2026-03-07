import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const newsItems = [
  {
    date: "June 15, 2024",
    title: "Quiz Team Wins Provincial Championship",
    desc: "Our Quiz Team took first place at the Old Mutual School Quiz competition with their innovative problem-solving skills.",
  },
  {
    date: "September 10, 2024",
    title: "Speech & Prize Ceremony",
    desc: "We celebrated our students' academic and athletic achievements at our annual awards ceremony.",
  },
  {
    date: "March 10, 2025",
    title: "Our New School Bus",
    desc: "The school has acquired a new state-of-the-art bus to enhance our transportation services for students.",
  },
];

const NewsSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">Latest News & Events</h2>
          <div className="w-16 h-1 bg-secondary mx-auto rounded-full" />
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {newsItems.map((item) => (
            <div
              key={item.title}
              className="bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover hover:-translate-y-2 transition-all duration-300 border border-border"
            >
              <div className="h-3 bg-secondary" />
              <div className="p-6">
                <p className="font-body text-sm text-accent-foreground font-semibold mb-2">{item.date}</p>
                <h3 className="font-display text-lg font-bold text-foreground mb-3">{item.title}</h3>
                <p className="font-body text-muted-foreground mb-4 leading-relaxed">{item.desc}</p>
                <Link to="/news" className="font-body text-school-sky-dark font-semibold inline-flex items-center gap-1 hover:gap-2 transition-all">
                  Read More <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            to="/news"
            className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-body font-semibold hover:opacity-90 transition-opacity"
          >
            View All News
          </Link>
        </div>
      </div>
    </section>
  );
};

export default NewsSection;
