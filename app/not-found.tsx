import Link from "next/link";
import { Button } from "@/components/ui/button";
import { VisualEffects } from "@/components/visual-effects";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <VisualEffects enableGrain />

      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-30 dark:opacity-20"
          style={{
            backgroundImage: "url('/assets/lost-kingdom.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background" />
      </div>

      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-6xl md:text-8xl font-medieval text-primary mb-6">
          404
        </h1>
        <div className="mb-8 relative">
          <div className="scroll-bg p-8 rounded-lg">
            <h2 className="text-3xl font-medieval text-secondary mb-4">
              Lost in the Kingdom
            </h2>
            <p className="text-lg mb-4">
              Alas, brave adventurer! The path you seek has vanished into the
              mists of Avalon.
            </p>
            <p className="text-lg">
              Perhaps the map was enchanted, or a mischievous sprite has led you
              astray. Fear not, for the way back to the royal court is clear.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/" passHref>
            <Button className="medieval-button bg-primary hover:bg-primary/90 text-primary-foreground">
              Return to the Kingdom
            </Button>
          </Link>
          <Link href="/game" passHref>
            <Button variant="outline" className="medieval-button">
              Join a Game
            </Button>
          </Link>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="flex gap-4 items-center">
          <div className="w-16 h-16 relative">
            <div className="fantasy-card w-full h-full absolute animate-[float_3s_ease-in-out_infinite] bg-white dark:bg-slate-200">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl text-red-600">♥</span>
              </div>
            </div>
          </div>
          <div className="w-16 h-16 relative">
            <div className="fantasy-card w-full h-full absolute animate-[float_4s_ease-in-out_infinite_0.5s] bg-white dark:bg-slate-200">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl text-red-600">♦</span>
              </div>
            </div>
          </div>
          <div className="w-16 h-16 relative">
            <div className="fantasy-card w-full h-full absolute animate-[float_3.5s_ease-in-out_infinite_1s] bg-white dark:bg-slate-200">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl text-slate-900 dark:text-white">
                  ♠
                </span>
              </div>
            </div>
          </div>
          <div className="w-16 h-16 relative">
            <div className="fantasy-card w-full h-full absolute animate-[float_4.5s_ease-in-out_infinite_1.5s] bg-white dark:bg-slate-200">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl text-slate-900 dark:text-white">
                  ♣
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
