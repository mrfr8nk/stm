import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CheckCircle, FileText, Calendar, DollarSign, Users, BookOpen, Award, Send, Loader2 } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    level: "o_level" as "zjc" | "o_level" | "a_level",
    form: 1,
    guardian_name: "",
    guardian_phone: "",
    guardian_email: "",
    previous_school: "",
    address: "",
    notes: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === "form" ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.email) {
      toast({ title: "Required Fields", description: "Please fill in your full name and email.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("applications").insert({
      full_name: form.full_name,
      email: form.email,
      phone: form.phone || null,
      date_of_birth: form.date_of_birth || null,
      level: form.level,
      form: form.form,
      guardian_name: form.guardian_name || null,
      guardian_phone: form.guardian_phone || null,
      guardian_email: form.guardian_email || null,
      previous_school: form.previous_school || null,
      address: form.address || null,
      notes: form.notes || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSubmitted(true);
      toast({ title: "Application Submitted!", description: "We will review your application and get back to you." });
    }
  };

  const getFormsForLevel = () => {
    if (form.level === "zjc") return [1, 2];
    if (form.level === "o_level") return [1, 2, 3, 4];
    return [5, 6];
  };

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

      {/* Online Application Form */}
      <section className="py-16 bg-muted" id="apply">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-foreground mb-4">Online Application</h2>
            <div className="w-16 h-1 bg-secondary mx-auto rounded-full" />
            <p className="text-muted-foreground mt-4">Fill out the form below to apply for admission.</p>
          </div>

          {submitted ? (
            <Card className="text-center py-12">
              <CardContent>
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="font-display text-2xl font-bold text-foreground mb-2">Application Submitted!</h3>
                <p className="text-muted-foreground mb-6">Thank you for applying to St. Mary's. We will review your application and contact you via email.</p>
                <Button onClick={() => { setSubmitted(false); setForm({ full_name: "", email: "", phone: "", date_of_birth: "", level: "o_level", form: 1, guardian_name: "", guardian_phone: "", guardian_email: "", previous_school: "", address: "", notes: "" }); }}>
                  Submit Another Application
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Application Form</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Student Information */}
                  <div>
                    <h3 className="font-display font-bold text-foreground mb-3">Student Information</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">Full Name *</label>
                        <Input name="full_name" value={form.full_name} onChange={handleChange} placeholder="Enter full name" required />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">Email Address *</label>
                        <Input name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@example.com" required />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">Phone Number</label>
                        <Input name="phone" value={form.phone} onChange={handleChange} placeholder="+263 7X XXX XXXX" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">Date of Birth</label>
                        <Input name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">Level</label>
                        <select name="level" value={form.level} onChange={e => { handleChange(e); const l = e.target.value; setForm(prev => ({ ...prev, level: l as any, form: l === "a_level" ? 5 : 1 })); }} className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm">
                          <option value="zjc">ZJC</option>
                          <option value="o_level">O Level</option>
                          <option value="a_level">A Level</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">Form</label>
                        <select name="form" value={form.form} onChange={handleChange} className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm">
                          {getFormsForLevel().map(f => <option key={f} value={f}>Form {f}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Guardian Information */}
                  <div>
                    <h3 className="font-display font-bold text-foreground mb-3">Guardian / Parent Information</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">Guardian Name</label>
                        <Input name="guardian_name" value={form.guardian_name} onChange={handleChange} placeholder="Full name" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">Guardian Phone</label>
                        <Input name="guardian_phone" value={form.guardian_phone} onChange={handleChange} placeholder="+263 7X XXX XXXX" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-sm font-medium text-foreground mb-1 block">Guardian Email</label>
                        <Input name="guardian_email" type="email" value={form.guardian_email} onChange={handleChange} placeholder="guardian@example.com" />
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div>
                    <h3 className="font-display font-bold text-foreground mb-3">Additional Information</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">Previous School</label>
                        <Input name="previous_school" value={form.previous_school} onChange={handleChange} placeholder="Name of previous school" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">Home Address</label>
                        <Input name="address" value={form.address} onChange={handleChange} placeholder="Full address" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-sm font-medium text-foreground mb-1 block">Additional Notes</label>
                        <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Any additional information..." rows={3} className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm resize-none" />
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                    {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : <><Send className="w-4 h-4 mr-2" /> Submit Application</>}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Pass Rates */}
      <section id="pass-rates" className="py-16 bg-background">
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
      <section className="py-16 bg-muted">
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
      <section className="py-16 bg-background">
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
      <section className="py-16 bg-muted">
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

      <Footer />
    </div>
  );
};

export default Admissions;
