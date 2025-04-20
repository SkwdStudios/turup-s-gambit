"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { VisualEffects } from "@/components/visual-effects";
import { FloatingCards } from "@/components/floating-cards";
import { AudioPlayer } from "@/components/audio-player";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

function ResetPasswordContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  function onSubmit(values: z.infer<typeof resetPasswordSchema>) {
    if (!token) {
      setError("Invalid or expired reset token");
      return;
    }

    setIsLoading(true);
    setError(null);

    // Simulate API call
    setTimeout(() => {
      console.log(
        "Reset password with token:",
        token,
        "New password:",
        values.password
      );
      setIsLoading(false);
      setSuccess(true);
    }, 1500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <VisualEffects enableGrain />
      <AudioPlayer />
      <FloatingCards />

      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-30 dark:opacity-20"
          style={{
            backgroundImage: "url('/assets/castle-interior.jpg')",
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

      <Card className="w-full max-w-md border-2 border-primary/30 shadow-xl bg-card/90 backdrop-blur-sm relative z-10">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-medieval text-primary">
            Reset Password
          </CardTitle>
          <CardDescription>
            Create a new password for your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!success ? (
            <>
              {!token && (
                <Alert className="mb-4 bg-destructive/20 text-destructive border-destructive/30">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <AlertDescription>
                    Invalid or expired reset token
                  </AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input
                            className="medieval-input"
                            type="password"
                            placeholder="••••••"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input
                            className="medieval-input"
                            type="password"
                            placeholder="••••••"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full medieval-button bg-primary hover:bg-primary/90 text-primary-foreground group"
                    disabled={isLoading || !token}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resetting password...
                      </>
                    ) : (
                      "Reset Password"
                    )}
                  </Button>
                </form>
              </Form>

              {error && (
                <Alert className="mt-4 bg-destructive/20 text-destructive border-destructive/30">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <div className="flex justify-center mb-4">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </div>
              <h3 className="text-xl font-medieval mb-2">
                Password Reset Successfully
              </h3>
              <p className="text-muted-foreground mb-6">
                Your password has been reset. You can now log in with your new
                password.
              </p>
              <Button
                className="medieval-button bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => router.push("/login")}
              >
                Return to Login
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-primary">
              Return to Login
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

// Fallback component to show while the main content is loading
function ResetPasswordFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <VisualEffects enableGrain />
      <AudioPlayer />
      <FloatingCards />

      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-30 dark:opacity-20"
          style={{
            backgroundImage: "url('/assets/castle-interior.jpg')",
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

      <Card className="w-full max-w-md border-2 border-primary/30 shadow-xl bg-card/90 backdrop-blur-sm relative z-10">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-medieval text-primary">
            Reset Password
          </CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
