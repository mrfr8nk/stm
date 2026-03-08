import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Fingerprint, Trash2, Loader2, Smartphone, CheckCircle } from "lucide-react";
import { isPlatformAuthenticatorAvailable, registerPasskey } from "@/lib/passkey";

const BiometricEnrollment = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [available, setAvailable] = useState(false);
  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    isPlatformAuthenticatorAvailable().then(setAvailable);
  }, []);

  const fetchPasskeys = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("passkey_credentials")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setPasskeys(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPasskeys(); }, [user]);

  const handleRegister = async () => {
    if (!user || !profile) return;
    setRegistering(true);
    try {
      const credentialId = await registerPasskey(user.id, user.email || "", profile.full_name);
      
      const deviceName = /iPhone|iPad/.test(navigator.userAgent)
        ? "iPhone / iPad"
        : /Android/.test(navigator.userAgent)
        ? "Android Device"
        : /Mac/.test(navigator.userAgent)
        ? "Mac"
        : /Windows/.test(navigator.userAgent)
        ? "Windows PC"
        : "My Device";

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/passkey-auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ action: "register", credential_id: credentialId, device_name: deviceName }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Registration failed");

      toast({ title: "Biometric Registered! 🎉", description: "You can now sign in with fingerprint or face scan." });
      fetchPasskeys();
    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        toast({ title: "Registration Failed", description: err.message, variant: "destructive" });
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this biometric credential?")) return;
    setDeleting(id);
    const { error } = await supabase.from("passkey_credentials").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Credential Removed" }); fetchPasskeys(); }
    setDeleting(null);
  };

  if (!available) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="w-5 h-5" /> Biometric Login
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Register your fingerprint or face scan for quick, passwordless sign-in.
        </p>

        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {passkeys.length > 0 && (
              <div className="space-y-2">
                {passkeys.map((pk) => (
                  <div key={pk.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Smartphone className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{pk.device_name || "My Device"}</p>
                        <p className="text-xs text-muted-foreground">
                          Added {new Date(pk.created_at).toLocaleDateString()}
                          {pk.last_used_at && ` · Last used ${new Date(pk.last_used_at).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(pk.id)}
                      disabled={deleting === pk.id}
                    >
                      {deleting === pk.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={handleRegister}
              disabled={registering}
              variant={passkeys.length > 0 ? "outline" : "default"}
              className="w-full"
            >
              {registering ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : passkeys.length > 0 ? (
                <Fingerprint className="w-4 h-4 mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {passkeys.length > 0 ? "Add Another Device" : "Enable Biometric Login"}
            </Button>

            {passkeys.length === 0 && (
              <p className="text-xs text-center text-muted-foreground">
                Your device's fingerprint sensor or face recognition will be activated
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BiometricEnrollment;
