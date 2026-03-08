import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Github, MessageCircle, MapPin, Code2, Globe, GraduationCap,
  Heart, ExternalLink, Mail, Calendar, Star, Zap, Cpu, Database, Palette,
  Shield, Smartphone, Server
} from "lucide-react";
import developerImg from "@/assets/developer-darrell.jpg";

const skills = [
  { name: "React / TypeScript", icon: Code2, level: 92 },
  { name: "Tailwind CSS", icon: Palette, level: 95 },
  { name: "Supabase / PostgreSQL", icon: Database, level: 88 },
  { name: "Node.js / Deno", icon: Server, level: 85 },
  { name: "UI/UX Design", icon: Smartphone, level: 90 },
  { name: "Cybersecurity", icon: Shield, level: 80 },
  { name: "AI Integration", icon: Cpu, level: 82 },
  { name: "Full-Stack Dev", icon: Zap, level: 90 },
];

const timeline = [
  { year: "2024", event: "Started building St. Mary's School Management System" },
  { year: "2024", event: "Integrated AI-powered features (Study Pal, Smart Search)" },
  { year: "2025", event: "Deployed full-stack app with real-time messaging & analytics" },
  { year: "2026", event: "Continuous improvements, Google OAuth, advanced reporting" },
];

const Credits = () => {
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Hero Section */}
      <div className="relative bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_50%,rgba(255,215,0,0.3),transparent_60%)]" />
        <div className="container mx-auto px-4 py-8 relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Back to website
          </Link>

          <div className="flex flex-col md:flex-row items-center gap-8 pb-8">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-secondary to-accent rounded-full blur opacity-60 group-hover:opacity-100 transition-opacity" />
              <img
                src={developerImg}
                alt="Darrell Mucheri"
                className="relative w-40 h-40 rounded-full object-cover border-4 border-secondary shadow-2xl"
              />
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 rounded-full border-4 border-primary flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
            </div>

            <div className="text-center md:text-left flex-1">
              <h1 className="font-display text-4xl md:text-5xl font-bold mb-2">Darrell Mucheri</h1>
              <p className="text-xl text-primary-foreground/80 mb-3">Full-Stack Developer & Student Innovator</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                <Badge variant="secondary" className="gap-1"><GraduationCap className="w-3 h-3" /> Upper 6 Science</Badge>
                <Badge variant="secondary" className="gap-1"><MapPin className="w-3 h-3" /> Zimbabwe 🇿🇼</Badge>
                <Badge variant="secondary" className="gap-1"><Calendar className="w-3 h-3" /> Age 18</Badge>
              </div>
              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                <a href="https://github.com/mrfr8nk" target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" size="sm" className="gap-2"><Github className="w-4 h-4" /> mrfr8nk</Button>
                </a>
                <a href="https://wa.me/263719647303" target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" size="sm" className="gap-2"><MessageCircle className="w-4 h-4" /> WhatsApp</Button>
                </a>
                <a href="mailto:darrellmucheri@gmail.com">
                  <Button variant="outline" size="sm" className="gap-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"><Mail className="w-4 h-4" /> Email</Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 space-y-12">
        {/* About */}
        <Card className="shadow-card overflow-hidden">
          <CardContent className="p-8">
            <h2 className="font-display text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-secondary" /> About the Developer
            </h2>
            <p className="text-muted-foreground leading-relaxed text-lg">
              I'm Darrell Mucheri, an 18-year-old Upper 6 Science student from Zimbabwe with a passion for building
              impactful software. I designed and developed the entire <strong>St. Mary's School Management System</strong> —
              a full-stack platform that handles everything from grades, attendance, and fee management to AI-powered study
              tools and real-time messaging. My mission is to transform how schools in Africa leverage technology for
              education.
            </p>
          </CardContent>
        </Card>

        {/* Skills Grid */}
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Code2 className="w-5 h-5 text-primary" /> Technical Skills
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {skills.map((skill) => (
              <Card key={skill.name} className="shadow-card hover:shadow-card-hover transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <skill.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-medium text-foreground text-sm">{skill.name}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div
                      className="bg-gradient-to-r from-primary to-accent h-2.5 rounded-full transition-all duration-1000"
                      style={{ width: `${skill.level}%` }}
                    />
                  </div>
                  <p className="text-right text-xs text-muted-foreground mt-1">{skill.level}%</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* GitHub Contributions */}
        <Card className="shadow-card overflow-hidden">
          <CardContent className="p-8">
            <h2 className="font-display text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Github className="w-5 h-5" /> GitHub Contributions
            </h2>
            <p className="text-muted-foreground mb-6">Live contribution graph from GitHub:</p>
            <div className="rounded-xl overflow-hidden border border-border bg-card">
              <img
                src="https://ghchart.rshah.org/003366/mrfr8nk"
                alt="Darrell Mucheri's GitHub Contribution Chart"
                className="w-full"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
              <a
                href="https://github.com/mrfr8nk"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
              >
                <ExternalLink className="w-4 h-4" /> View Full Profile on GitHub
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Project Timeline */}
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent" /> Development Timeline
          </h2>
          <div className="space-y-4">
            {timeline.map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-primary border-2 border-secondary" />
                  {i < timeline.length - 1 && <div className="w-0.5 flex-1 bg-border" />}
                </div>
                <div className="pb-6">
                  <Badge variant="outline" className="mb-1">{item.year}</Badge>
                  <p className="text-foreground">{item.event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <Card className="shadow-card">
          <CardContent className="p-8">
            <h2 className="font-display text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" /> Built With
            </h2>
            <div className="flex flex-wrap gap-2">
              {[
                "React", "TypeScript", "Tailwind CSS", "Vite", "Supabase", "PostgreSQL",
                "Deno Edge Functions", "Lovable AI", "jsPDF", "Recharts", "React Router",
                "Tanstack Query", "Framer Motion", "shadcn/ui", "Google OAuth"
              ].map((tech) => (
                <Badge key={tech} variant="secondary" className="text-sm py-1 px-3">{tech}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Copyright & Legal */}
        <Card className="shadow-card border-2 border-primary/20">
          <CardContent className="p-8">
            <h2 className="font-display text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Copyright & Legal
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <p>© {new Date().getFullYear()} <strong className="text-foreground">Darrell Mucheri</strong>. All rights reserved.</p>
              <p>
                The <strong>St. Mary's School Management System</strong> is proprietary software developed by Darrell Mucheri.
                Unauthorized copying, distribution, or modification of this software is strictly prohibited.
              </p>
              <p>
                This software is provided "as-is" without warranty of any kind, express or implied. The developer is not
                liable for any damages arising from the use of this software.
              </p>
              <div className="pt-2 flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Chitungwiza, Zimbabwe 🇿🇼</span>
                <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> darrellmucheri@gmail.com</span>
                <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> +263 719 647 303</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer CTA */}
        <div className="text-center py-8">
          <p className="text-muted-foreground flex items-center justify-center gap-1">
            Made with <Heart className="w-4 h-4 text-destructive fill-destructive" /> by Darrell Mucheri
          </p>
          <Link to="/" className="text-primary hover:underline mt-2 inline-block">← Back to St. Mary's</Link>
        </div>
      </div>
    </div>
  );
};

export default Credits;
