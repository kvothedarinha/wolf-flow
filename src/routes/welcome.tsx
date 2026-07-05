import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ProgressRing";
import { Check, CalendarDays, Flame, Waves } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/welcome")({ component: WelcomePage });

export const ONBOARDED_KEY = "tf-onboarded";
export const WELCOME_PENDING_KEY = "tf-welcome-pending";

function WelcomePage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  function finish() {
    localStorage.setItem(ONBOARDED_KEY, "1");
    localStorage.removeItem(WELCOME_PENDING_KEY);
    navigate({ to: "/" });
  }

  const isLast = current === 2;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="h-12 w-12 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center mb-8">
          <Waves className="h-6 w-6" />
        </div>

        <Carousel setApi={setApi} className="w-full">
          <CarouselContent>
            <CarouselItem>
              <Slide
                title="Crie hábitos do seu jeito"
                text="Dias fixos da semana ou uma meta livre de vezes por semana — você escolhe o ritmo de cada hábito."
              >
                <div className="flex gap-1.5">
                  {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                    <span
                      key={i}
                      className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold ${
                        [1, 3, 5].includes(i)
                          ? "bg-accent text-accent-foreground"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </Slide>
            </CarouselItem>
            <CarouselItem>
              <Slide
                title="Um toque por dia"
                text="Marque o check-in em segundos e proteja sua sequência. Esqueceu ontem? Marque retroativo na semana."
              >
                <div className="flex items-center gap-4">
                  <span className="h-12 w-12 rounded-xl border-2 flex items-center justify-center text-white bg-accent border-accent">
                    <Check className="h-6 w-6" strokeWidth={3.5} />
                  </span>
                  <span className="inline-flex items-center gap-1 text-warning font-bold text-lg">
                    <Flame className="h-5 w-5" />
                    12 dias
                  </span>
                </div>
              </Slide>
            </CarouselItem>
            <CarouselItem>
              <Slide
                title="Veja sua evolução"
                text="Anel de progresso do dia, histórico geral em mapa de calor e estatísticas de cada hábito."
              >
                <div className="flex items-center gap-5">
                  <ProgressRing value={0.72} size={72} strokeWidth={7} />
                  <CalendarDays className="h-10 w-10 text-muted-foreground" />
                </div>
              </Slide>
            </CarouselItem>
          </CarouselContent>
        </Carousel>

        <div className="flex gap-1.5 my-6">
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              onClick={() => api?.scrollTo(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                current === i ? "w-6 bg-accent" : "w-2 bg-secondary"
              }`}
            />
          ))}
        </div>

        <div className="w-full flex gap-2">
          {!isLast && (
            <Button variant="outline" className="flex-1 rounded-full" onClick={finish}>
              Pular
            </Button>
          )}
          <Button
            className="flex-1 rounded-full"
            onClick={() => (isLast ? finish() : api?.scrollNext())}
          >
            {isLast ? "Começar" : "Próximo"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Slide({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center px-2">
      <div className="h-32 flex items-center justify-center mb-6">{children}</div>
      <h2 className="text-xl font-extrabold tracking-tight mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-[30ch]">{text}</p>
    </div>
  );
}
