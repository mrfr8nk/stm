import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CheckCircle, FileText, Calendar, DollarSign, Users, BookOpen, Award } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { Link } from "react-router-dom";

const requirements = [
  "Completed application form",
  "Certified copies of birth certificate",
  "Previous school academic records / transfer letter",
  "Two recent passport-size photographs",
  "Grade 7 results (for Form 1 entry)",
  "O-Level results (for Form 5 entry)",
  "School fees deposit (non-refundable)",
  "Medical examination report",
];

const feeStructure = [
  { level: "Form 1 - 4 (O-Level)", tuition: "$250", levy: "$50", total: "$300" },
  { level: "Form 5 - 6 (A-Level)", tuition: "$300", levy: "$60", total: "$360" },
];

const passRates = [
  { year: "2024", oLevel: "89%", aLevel: "92%" },
  { year: "2023", oLevel: "87%", aLevel: "90%" },
  { year: "2022", oLevel: "85%", aLevel: "88%" },
  { year: "2021", oLevel: "83%", aLevel: "91%" },
];

const timeline = [
  { month: "January - March", event: "Applications Open for Next Academic Year" },
  { month: "April - May", event: "Entrance Examinations & Interviews" },
  { month: "June", event: "Admission Offers Released" },
  { month: "July", event: "Acceptance Deadline & Fee Payment" },
  { month: "August", event: "Orientation for New Students" },
  { month: "September", event: "Term 1 Begins" },
];

const Admissions = () => {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Banner */}
      <section className="relative pt-20">
        <div className="h-64 md:h-80 relative overflow-hidden">
          <img src={heroBg} alt="Campus" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-hero flex items-center justify-center">
            <div className="text-center">
              <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-2">Admissions</h1>
              <p className="font-body text-primary-foreground/70 text-lg">Join the St. Mary's Family</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-foreground mb-4">Why Choose St. Mary's?</h2>
            <div className="w-16 h-1 bg-secondary mx-auto rounded-full" />
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { icon: Award, title: "Academic Excellence", desc: "Consistently high pass rates at both O-Level and A-Level examinations with ZIMSEC curriculum." },
              { icon: Users, title: "Holistic Development", desc: "We develop the whole person — mind, body, and spirit through academics, sports, and cultural activities." },
              { icon: BookOpen, title: "Experienced Faculty", desc: "55 dedicated and qualified teachers committed to bringing out the best in every student." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-card rounded-2xl p-8 shadow-card hover:shadow-card-hover hover:-translate-y-2 transition-all duration-300 border border-border text-center">
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-3">{title}</h3>
                <p className="font-body text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pass Rates */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-foreground mb-4">Our Pass Rates</h2>
            <div className="w-16 h-1 bg-secondary mx-auto rounded-full" />
          </div>
          <div className="bg-card rounded-2xl shadow-card overflow-hidden border border-border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-primary">
                    <th className="px-6 py-4 text-left font-body font-bold text-primary-foreground">Year</th>
                    <th className="px-6 py-4 text-left font-body font-bold text-primary-foreground">O-Level Pass Rate</th>
                    <th className="px-6 py-4 text-left font-body font-bold text-primary-foreground">A-Level Pass Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {passRates.map((row, i) => (
                    <tr key={row.year} className={i % 2 === 0 ? "bg-card" : "bg-muted"}>
                      <td className="px-6 py-4 font-body font-semibold text-foreground">{row.year}</td>
                      <td className="px-6 py-4 font-body text-foreground">
                        <span className="inline-flex items-center gap-1 text-success font-semibold">
                          <Award className="w-4 h-4" /> {row.oLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-body text-foreground">
                        <span className="inline-flex items-center gap-1 text-success font-semibold">
                          <Award className="w-4 h-4" /> {row.aLevel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-foreground mb-4">Admission Requirements</h2>
            <div className="w-16 h-1 bg-secondary mx-auto rounded-full" />
          </div>
          <div className="bg-card rounded-2xl p-8 shadow-card border border-border">
            <div className="grid sm:grid-cols-2 gap-4">
              {requirements.map((req) => (
                <div key={req} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <p className="font-body text-foreground">{req}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Fee Structure */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-foreground mb-4">Fee Structure (Per Term)</h2>
            <div className="w-16 h-1 bg-secondary mx-auto rounded-full" />
          </div>
          <div className="bg-card rounded-2xl shadow-card overflow-hidden border border-border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-primary">
                    <th className="px-6 py-4 text-left font-body font-bold text-primary-foreground">Level</th>
                    <th className="px-6 py-4 text-left font-body font-bold text-primary-foreground">Tuition</th>
                    <th className="px-6 py-4 text-left font-body font-bold text-primary-foreground">Levy</th>
                    <th className="px-6 py-4 text-left font-body font-bold text-primary-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {feeStructure.map((row, i) => (
                    <tr key={row.level} className={i % 2 === 0 ? "bg-card" : "bg-muted"}>
                      <td className="px-6 py-4 font-body font-semibold text-foreground">{row.level}</td>
                      <td className="px-6 py-4 font-body text-foreground">{row.tuition}</td>
                      <td className="px-6 py-4 font-body text-foreground">{row.levy}</td>
                      <td className="px-6 py-4 font-body font-bold text-secondary">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="font-body text-sm text-muted-foreground mt-4 text-center">
            * Fees are subject to change. Contact the school for the most current fee structure.
          </p>
        </div>
      </section>

      {/* Application Timeline */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-foreground mb-4">Application Timeline</h2>
            <div className="w-16 h-1 bg-secondary mx-auto rounded-full" />
          </div>
          <div className="space-y-0">
            {timeline.map((item, i) => (
              <div key={item.month} className="flex gap-6 items-start">
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full bg-secondary border-4 border-secondary/30 flex-shrink-0" />
                  {i < timeline.length - 1 && <div className="w-0.5 h-16 bg-border" />}
                </div>
                <div className="pb-8">
                  <p className="font-body font-bold text-primary text-sm">{item.month}</p>
                  <p className="font-body text-foreground">{item.event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-cta" />
        </div>
        <div className="relative z-10 container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">Ready to Apply?</h2>
          <p className="font-body text-primary-foreground/80 mb-8 max-w-lg mx-auto">
            Take the first step towards excellence. Contact us to begin your application process.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-8 py-4 rounded-xl font-body font-bold text-lg hover:opacity-90 transition-all hover:-translate-y-1 shadow-lg"
          >
            <FileText className="w-5 h-5" />
            Contact Us to Apply
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Admissions;
