"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VisualEffects } from "@/components/visual-effects";
import { FloatingCards } from "@/components/floating-cards";
import { AudioPlayer } from "@/components/audio-player";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
});

const signupSchema = z
  .object({
    username: z
      .string()
      .min(3, { message: "Username must be at least 3 characters" }),
    email: z.string().email({ message: "Invalid email address" }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const anonymousSchema = z.object({
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters" }),
});

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeView, setActiveView] = useState<
    "login" | "signup" | "anonymous" | "forgot-password"
  >("login");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [usernameExists, setUsernameExists] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const usernameCheckTimeout = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Mock database of existing usernames
  const existingUsernames = [
    "Merlin",
    "Arthur",
    "Lancelot",
    "Guinevere",
    "Morgana",
  ];

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const anonymousForm = useForm<z.infer<typeof anonymousSchema>>({
    resolver: zodResolver(anonymousSchema),
    defaultValues: {
      username: "",
    },
  });

  const forgotPasswordForm = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // Check if username exists
  const checkUsername = (username: string) => {
    if (username.length < 3) return;

    setIsCheckingUsername(true);

    // Clear any existing timeout
    if (usernameCheckTimeout.current) {
      clearTimeout(usernameCheckTimeout.current);
    }

    // Set a new timeout to check username after typing stops
    usernameCheckTimeout.current = setTimeout(() => {
      // Check against mock database
      const exists = existingUsernames.some(
        (name) => name.toLowerCase() === username.toLowerCase()
      );
      setUsernameExists(exists);
      setIsCheckingUsername(false);
    }, 500);
  };

  useEffect(() => {
    // Cleanup timeout on component unmount
    return () => {
      if (usernameCheckTimeout.current) {
        clearTimeout(usernameCheckTimeout.current);
      }
    };
  }, []);

  function onLoginSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    setError(null);

    // Simulate API call
    setTimeout(() => {
      console.log("Login:", values);
      setIsLoading(false);
      router.push("/");
    }, 1500);
  }

  function onSignupSubmit(values: z.infer<typeof signupSchema>) {
    setIsLoading(true);
    setError(null);

    // Simulate API call
    setTimeout(() => {
      console.log("Signup:", values);
      setIsLoading(false);
      router.push("/");
    }, 1500);
  }

  function onAnonymousSubmit(values: z.infer<typeof anonymousSchema>) {
    if (usernameExists) {
      setError("This username is already taken. Please choose another one.");
      return;
    }

    setIsLoading(true);
    setError(null);

    // Simulate API call
    setTimeout(() => {
      console.log("Anonymous login:", values);
      setIsLoading(false);
      router.push("/");
    }, 1500);
  }

  function onForgotPasswordSubmit(
    values: z.infer<typeof forgotPasswordSchema>
  ) {
    setIsLoading(true);
    setError(null);

    // Simulate API call
    setTimeout(() => {
      console.log("Password reset requested for:", values.email);
      setIsLoading(false);
      setSuccess(
        `Password reset link sent to ${values.email}. Please check your inbox.`
      );
    }, 1500);
  }

  function handleSocialLogin(provider: string) {
    setIsLoading(true);
    setError(null);

    // Simulate OAuth redirect
    setTimeout(() => {
      console.log(`Logging in with ${provider}`);
      setIsLoading(false);
      router.push("/");
    }, 1500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <VisualEffects enableGrain />
      <AudioPlayer autoPlay />
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
            Turup's Gambit
          </CardTitle>
          <CardDescription>
            Enter the realm of strategy and cunning
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeView === "login" && (
            <>
              <Tabs defaultValue="email" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="email" className="font-medieval">
                    Email
                  </TabsTrigger>
                  <TabsTrigger value="anonymous" className="font-medieval">
                    Anonymous
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="email">
                  <Form {...loginForm}>
                    <form
                      onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                className="medieval-input"
                                placeholder="your@email.com"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
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

                      <div className="text-right">
                        <Button
                          type="button"
                          variant="link"
                          className="p-0 h-auto font-medieval text-secondary"
                          onClick={() => setActiveView("forgot-password")}
                        >
                          Forgot password?
                        </Button>
                      </div>

                      <Button
                        type="submit"
                        className="w-full medieval-button bg-primary hover:bg-primary/90 text-primary-foreground group"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Entering the realm...
                          </>
                        ) : (
                          "Enter the Realm"
                        )}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="anonymous">
                  <Form {...anonymousForm}>
                    <form
                      onSubmit={anonymousForm.handleSubmit(onAnonymousSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={anonymousForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Choose a Username</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  className="medieval-input"
                                  placeholder="Sir Lancelot"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    checkUsername(e.target.value);
                                  }}
                                />
                                {isCheckingUsername && (
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                            </FormControl>
                            {usernameExists && field.value.length >= 3 && (
                              <p className="text-sm font-medium text-destructive mt-1">
                                This username is already taken
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full medieval-button bg-primary hover:bg-primary/90 text-primary-foreground group"
                        disabled={isLoading || usernameExists}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating your legend...
                          </>
                        ) : (
                          "Enter as Guest"
                        )}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="medieval-button"
                  onClick={() => handleSocialLogin("Google")}
                  disabled={isLoading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="medieval-button"
                  onClick={() => handleSocialLogin("Discord")}
                  disabled={isLoading}
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3847-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                  </svg>
                  Discord
                </Button>
              </div>
            </>
          )}

          {activeView === "signup" && (
            <Form {...signupForm}>
              <form
                onSubmit={signupForm.handleSubmit(onSignupSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={signupForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            className="medieval-input"
                            placeholder="Sir Lancelot"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              checkUsername(e.target.value);
                            }}
                          />
                          {isCheckingUsername && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </FormControl>
                      {usernameExists && field.value.length >= 3 && (
                        <p className="text-sm font-medium text-destructive mt-1">
                          This username is already taken
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signupForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          className="medieval-input"
                          placeholder="your@email.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signupForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
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
                  control={signupForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
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
                  disabled={isLoading || usernameExists}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating your legend...
                    </>
                  ) : (
                    "Create Your Legend"
                  )}
                </Button>
              </form>
            </Form>
          )}

          {activeView === "forgot-password" && (
            <>
              <div className="mb-4">
                <h3 className="text-lg font-medieval mb-2">
                  Recover Your Password
                </h3>
                <p className="text-sm text-muted-foreground">
                  Enter your email address and we'll send you a link to reset
                  your password.
                </p>
              </div>

              {success && (
                <Alert className="mb-4 bg-green-500/20 text-green-600 border-green-600/30">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <Form {...forgotPasswordForm}>
                <form
                  onSubmit={forgotPasswordForm.handleSubmit(
                    onForgotPasswordSubmit
                  )}
                  className="space-y-4"
                >
                  <FormField
                    control={forgotPasswordForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            className="medieval-input"
                            placeholder="your@email.com"
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
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending recovery link...
                      </>
                    ) : (
                      "Send Recovery Link"
                    )}
                  </Button>
                </form>
              </Form>
            </>
          )}

          {error && (
            <Alert className="mt-4 bg-destructive/20 text-destructive border-destructive/30">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          {activeView === "login" && (
            <Button
              type="button"
              variant="outline"
              className="w-full medieval-button"
              onClick={() => setActiveView("signup")}
              disabled={isLoading}
            >
              Create New Account
            </Button>
          )}

          {(activeView === "signup" || activeView === "forgot-password") && (
            <Button
              type="button"
              variant="outline"
              className="w-full medieval-button"
              onClick={() => setActiveView("login")}
              disabled={isLoading}
            >
              Back to Login
            </Button>
          )}

          <div className="text-center text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary">
              Return to the Kingdom
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
