import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ArrowRight } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const newsItems = [
  {
    date: "March 10, 2025",
    title: "Our New School Bus",
    desc: "The school has acquired a new state-of-the-art 75-seater bus to enhance transportation services for students during educational trips and sporting events.",
  },
  {
    date: "September 10, 2024",
    title: "Speech & Prize Ceremony",
    desc: "We celebrated our students' academic and athletic achievements at our annual awards ceremony, recognizing outstanding performance across all departments.",
  },
  {
    date: "June 15, 2024",
    title: "Quiz Team Wins Provincial Championship",
    desc: "Our Quiz Team took first place at the Old Mutual School Quiz competition, demonstrating innovative problem-solving skills and teamwork.",
  },
  {
    date: "May 20, 2024",
    title: "New Special Needs Block",
    desc: "We are nearing completion of a new state-of-the-art Special Needs Block, a donation courtesy of the Lord Bishop, the Rt Reverend Dr. F. Mutamiri.",
  },
  {
    date: "April 5, 2024",
    title: "Sports Day 2024",
    desc: "Our annual sports day saw record participation with students competing in athletics, soccer, netball, and other sporting activities.",
  },
  {
    date: "February 15, 2024",
    title: "Term 1 Orientation",
    desc: "New students and parents were welcomed to the St. Mary's family during our comprehensive orientation program for the new academic year.",
  },
];

const News = () => {
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
          <div className="space-y-6">
            {newsItems.map((item) => (
              <article
                key={item.title}
                className="bg-card rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 border border-border group"
              >
                <p className="font-body text-sm text-secondary font-semibold mb-2">{item.date}</p>
                <h2 className="font-display text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">{item.title}</h2>
                <p className="font-body text-muted-foreground leading-relaxed mb-4">{item.desc}</p>
                <span className="font-body text-school-sky-dark font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all cursor-pointer">
                  Read More <ArrowRight className="w-4 h-4" />
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default News;
