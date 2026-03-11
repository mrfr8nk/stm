import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft, Send, CheckCircle2, RefreshCw } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";
import { supabase } from "@/integrations/supabase/client";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use the site's own published URL for the reset redirect
      const siteUrl = window.location.origin;
      const redirectUrl = `${siteUrl}/reset-password`;

      const { error } = await supabase.functions.invoke("send-branded-email", {
        body: {
          email: email.trim(),
          type: "reset_password",
          redirect_url: redirectUrl,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to send email");
      }

      setSent(true);
      toast({ title: "Email sent", description: "Check your inbox for the password reset link. Also check your spam/junk folder." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-8">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-card shadow-lg border-2 border-primary/20 mb-4">
            <img src={schoolLogo} alt="St. Mary's High School" className="h-16 w-16 object-contain" />
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">St. Mary's High School</h1>
          <p className="text-xs text-muted-foreground italic mt-1">Excellence & Integrity</p>
        </div>

        <div className="bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />

          <div className="p-8">
            {sent ? (
              <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 mx-auto">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Check Your Email</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    We've sent a password reset link to
                  </p>
                  <p className="font-semibold text-foreground mt-1">{email}</p>
                </div>

                <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2">
                  <p className="text-sm font-medium text-foreground">What to do next:</p>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold mt-0.5">1.</span>
                      Open your email inbox (Gmail, Yahoo, etc.)
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold mt-0.5">2.</span>
                      Click the password reset link in the email
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold mt-0.5">3.</span>
                      Check your spam/junk folder if you don't see it
                    </li>
                  </ul>
                </div>

                <Button variant="outline" onClick={() => setSent(false)} className="w-full gap-2">
                  <RefreshCw className="h-4 w-4" /> Try with a different email
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Reset Password</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Enter your email address and we'll send you a secure link to reset your password.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="your.email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-10 h-12"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-12 gap-2 text-base font-semibold" disabled={loading}>
                    {loading ? (
                      <><RefreshCw className="h-4 w-4 animate-spin" /> Sending...</>
                    ) : (
                      <><Send className="h-4 w-4" /> Send Reset Link</>
                    )}
                  </Button>
                </form>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-border/50 text-center">
              <Link to="/login" className="text-sm text-primary hover:underline inline-flex items-center gap-1.5 font-medium">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
              </Link>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} St. Mary's High School. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
