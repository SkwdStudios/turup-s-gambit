import Link from "next/link"
import { Button } from "@/components/ui/button"
import { VisualEffects } from "@/components/visual-effects"

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen pt-20 pb-16">
      <VisualEffects enableGrain />

      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 dark:opacity-20"
          style={{ backgroundImage: "url('/assets/medieval-library.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background" />
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-medieval text-primary mb-4">Privacy Policy</h1>
            <p className="text-xl text-foreground/80">The Royal Decree on Data Protection and User Privacy</p>
          </div>

          <div className="scroll-bg p-8 rounded-lg mb-8">
            <h2 className="text-2xl font-medieval text-secondary mb-4">Introduction</h2>
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p>
                Welcome to Turup's Gambit, a fantasy card game set in a medieval realm. This Privacy Policy explains how
                we collect, use, and protect your personal information when you use our game and services.
              </p>
              <p>
                By accessing or using Turup's Gambit, you agree to the collection and use of information in accordance
                with this policy. We take your privacy seriously and are committed to protecting your personal data.
              </p>
            </div>
          </div>

          <div className="scroll-bg p-8 rounded-lg mb-8">
            <h2 className="text-2xl font-medieval text-secondary mb-4">Information We Collect</h2>
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <h3>Personal Information</h3>
              <p>When you create an account, we may collect the following information:</p>
              <ul>
                <li>Username</li>
                <li>Email address</li>
                <li>Password (encrypted)</li>
                <li>Profile picture (if provided)</li>
              </ul>

              <h3>Gameplay Information</h3>
              <p>We collect data related to your gameplay, including:</p>
              <ul>
                <li>Game statistics (wins, losses, scores)</li>
                <li>In-game actions and decisions</li>
                <li>Chat messages sent during gameplay</li>
                <li>Game replays</li>
              </ul>

              <h3>Technical Information</h3>
              <p>We automatically collect certain technical information when you use our game:</p>
              <ul>
                <li>IP address</li>
                <li>Device information</li>
                <li>Browser type and version</li>
                <li>Operating system</li>
                <li>Time and date of access</li>
              </ul>
            </div>
          </div>

          <div className="scroll-bg p-8 rounded-lg mb-8">
            <h2 className="text-2xl font-medieval text-secondary mb-4">How We Use Your Information</h2>
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p>We use the collected information for various purposes:</p>
              <ul>
                <li>To create and manage your account</li>
                <li>To provide and maintain our game services</li>
                <li>To improve the game experience and develop new features</li>
                <li>To match you with other players</li>
                <li>To track game statistics and leaderboards</li>
                <li>To communicate with you about updates and announcements</li>
                <li>To prevent cheating and enforce our terms of service</li>
                <li>To analyze usage patterns and optimize performance</li>
              </ul>
            </div>
          </div>

          <div className="scroll-bg p-8 rounded-lg mb-8">
            <h2 className="text-2xl font-medieval text-secondary mb-4">Data Security</h2>
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p>
                We implement appropriate security measures to protect your personal information against unauthorized
                access, alteration, disclosure, or destruction. These measures include:
              </p>
              <ul>
                <li>Password encryption</li>
                <li>Secure socket layer (SSL) technology</li>
                <li>Regular security assessments</li>
                <li>Access controls and authentication procedures</li>
              </ul>
              <p>
                However, please be aware that no method of transmission over the Internet or method of electronic
                storage is 100% secure. While we strive to use commercially acceptable means to protect your personal
                information, we cannot guarantee its absolute security.
              </p>
            </div>
          </div>

          <div className="scroll-bg p-8 rounded-lg mb-8">
            <h2 className="text-2xl font-medieval text-secondary mb-4">Your Rights</h2>
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p>You have certain rights regarding your personal information:</p>
              <ul>
                <li>The right to access your personal data</li>
                <li>The right to correct inaccurate or incomplete data</li>
                <li>The right to delete your account and associated data</li>
                <li>The right to restrict or object to processing of your data</li>
                <li>The right to data portability</li>
              </ul>
              <p>
                To exercise these rights, please contact us using the information provided at the end of this policy.
              </p>
            </div>
          </div>

          <div className="scroll-bg p-8 rounded-lg mb-8">
            <h2 className="text-2xl font-medieval text-secondary mb-4">Changes to This Policy</h2>
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p>
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new
                Privacy Policy on this page and updating the "Last Updated" date.
              </p>
              <p>
                You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy
                Policy are effective when they are posted on this page.
              </p>
            </div>
          </div>

          <div className="scroll-bg p-8 rounded-lg mb-8">
            <h2 className="text-2xl font-medieval text-secondary mb-4">Contact Us</h2>
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p>If you have any questions about this Privacy Policy, please contact us:</p>
              <ul>
                <li>By email: privacy@courtpiece.com</li>
                <li>By visiting the contact page on our website</li>
                <li>By mail: Court Piece Privacy Office, 123 Medieval Lane, Kingdom of Cards, 54321</li>
              </ul>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-6">Last Updated: March 30, 2023</p>
            <Link href="/" passHref>
              <Button className="medieval-button bg-primary hover:bg-primary/90 text-primary-foreground">
                Return to the Kingdom
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

