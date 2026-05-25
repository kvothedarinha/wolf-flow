import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Instagram, Youtube, Music2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/p/$username")({ component: PublicMediaKit });

function PublicMediaKit() {
  const { username } = Route.useParams();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("profiles").select("*").eq("username", username).maybeSingle()
      .then(({ data }) => { setProfile(data); setLoading(false); });
  }, [username]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!profile) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Mídia kit não encontrado.</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="inline-flex h-16 w-16 rounded-full bg-primary/15 text-primary items-center justify-center text-2xl font-semibold">
            {profile.name?.charAt(0) ?? "?"}
          </div>
          <h1 className="text-3xl font-semibold mt-4">{profile.name}</h1>
          <p className="text-muted-foreground mt-1">@{profile.username}</p>
          {profile.bio && <p className="text-sm text-muted-foreground mt-4 max-w-md mx-auto">{profile.bio}</p>}

          <div className="flex justify-center gap-3 mt-6">
            {profile.instagram_handle && <SocialPill icon={<Instagram className="h-4 w-4" />} label={profile.instagram_handle} />}
            {profile.tiktok_handle && <SocialPill icon={<Music2 className="h-4 w-4" />} label={profile.tiktok_handle} />}
            {profile.youtube_handle && <SocialPill icon={<Youtube className="h-4 w-4" />} label={profile.youtube_handle} />}
          </div>
        </div>

        <div className="mt-12">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm uppercase tracking-wider text-muted-foreground">Cases em destaque</h2>
          </div>
          <Card className="border-dashed bg-secondary/40">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nenhum case destacado ainda.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SocialPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs">
      {icon}<span>{label}</span>
    </div>
  );
}
