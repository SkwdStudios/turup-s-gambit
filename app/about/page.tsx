import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VisualEffects } from "@/components/visual-effects";

const teamMembers = [
  {
    name: "Sir Lancelot",
    role: "Lead Game Designer",
    bio: "A knight of the round table, Sir Lancelot brings his strategic mind to the design of Court Piece.",
    image: "/assets/team-member-1.jpg",
  },
  {
    name: "Lady Guinevere",
    role: "Art Director",
    bio: "With an eye for beauty and detail, Lady Guinevere creates the visual splendor of the game.",
    image: "/assets/team-member-2.jpg",
  },
  {
    name: "Merlin",
    role: "Lead Developer",
    bio: "The wizard of code, Merlin weaves the magic that brings Court Piece to life in the digital realm.",
    image: "/assets/team-member-3.jpg",
  },
  {
    name: "Morgan le Fay",
    role: "Sound Designer",
    bio: "The enchantress whose melodies and sound effects transport players to the medieval fantasy world.",
    image: "/assets/team-member-4.jpg",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <VisualEffects enableGrain />

      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 dark:opacity-20"
          style={{ backgroundImage: "url('/assets/medieval-library.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background" />
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-medieval text-primary mb-4">
            About Turup's Gambit
          </h1>
          <p className="text-xl max-w-3xl mx-auto text-foreground/80">
            A legendary card game from the ancient realms, reimagined for the
            digital age
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-16">
          <div className="scroll-bg p-8 rounded-lg">
            <h2 className="text-3xl font-medieval text-secondary mb-6">
              The Legend
            </h2>
            <div className="prose prose-lg dark:prose-invert">
              <p>
                Turup's Gambit, known in the ancient scrolls as "Hokm,"
                originated in the mystical eastern kingdoms. Legend has it that
                kings and queens would gather to test their wits and strategy
                through this game of cards.
              </p>
              <p>
                As the game traveled westward, it evolved, taking on new rules
                and traditions. Knights would play between battles, using the
                game to sharpen their minds for the strategic challenges of
                warfare.
              </p>
              <p>
                Now, in the digital age, we bring this ancient game to you,
                preserving its rich history while enhancing it with the magic of
                modern technology.
              </p>
            </div>
          </div>

          <div className="scroll-bg p-8 rounded-lg">
            <h2 className="text-3xl font-medieval text-secondary mb-6">
              How To Play
            </h2>
            <div className="prose prose-lg dark:prose-invert">
              <p>
                Court Piece is a trick-taking card game played with a standard
                deck of 52 cards. The game is typically played by four players
                in fixed partnerships, with partners sitting opposite each
                other.
              </p>
              <p>
                The objective is to win a predetermined number of hands (usually
                7 out of 13) before your opponents. The game combines elements
                of strategy, memory, and a bit of luck.
              </p>
              <p>
                Our digital version offers two modes: Classic (traditional
                rules) and Frenzy (a faster-paced variant with special powers
                and effects).
              </p>
              <Link href="/game" className="text-primary hover:underline">
                Learn more by playing a game →
              </Link>
            </div>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-medieval text-primary text-center mb-12">
            The Royal Court
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member, index) => (
              <Card
                key={index}
                className="border-2 border-primary/30 bg-card/80 backdrop-blur-sm overflow-hidden"
              >
                <div className="aspect-square relative">
                  <Image
                    src={
                      member.image || `/placeholder.svg?height=300&width=300`
                    }
                    alt={member.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <CardContent className="p-6">
                  <h3 className="text-xl font-medieval text-secondary mb-1">
                    {member.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {member.role}
                  </p>
                  <p className="text-sm">{member.bio}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="text-center">
          <Link href="/" passHref>
            <Button className="medieval-button bg-primary hover:bg-primary/90 text-primary-foreground">
              Return to the Kingdom
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
