import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const usePresence = () => {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!user) return;

    const upsertPresence = async (online: boolean) => {
      await supabase
        .from("user_presence" as any)
        .upsert({ user_id: user.id, is_online: online, last_seen: new Date().toISOString() } as any, { onConflict: "user_id" });
    };

    upsertPresence(true);
    intervalRef.current = setInterval(() => upsertPresence(true), 30000);

    const handleVisibility = () => {
      upsertPresence(!document.hidden);
    };

    const handleBeforeUnload = () => upsertPresence(false);

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      upsertPresence(false);
    };
  }, [user]);
};
