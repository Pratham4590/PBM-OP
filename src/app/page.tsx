'use client';
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLogo } from "@/components/icons";
import { placeholderImages } from "@/lib/data";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/firebase";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, doc, setDoc } from "firebase/firestore";
import { useFirestore } from "@/firebase";


function LoginPageContent() {
  const loginImage = placeholderImages.find(p => p.id === 'login-bg');
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid credentials. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) return;
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Add user to the 'users' collection in Firestore
      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(userDocRef, {
          email: user.email,
          role: 'Member' // Default role
      });

      toast({
        title: "Sign Up Successful",
        description: "Your account has been created. Please log in.",
      });
      setIsLoginView(true); // Switch to login view
      setEmail('');
      setPassword('');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: error.message || "Could not create account.",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
             <div className="flex justify-center items-center gap-2">
                <AppLogo className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold">Notebook Navigator</h1>
            </div>
            <p className="text-balance text-muted-foreground">
              {isLoginView ? 'Enter your credentials to access your account' : 'Create a new account to get started'}
            </p>
          </div>
          <form onSubmit={isLoginView ? handleLogin : handleSignUp} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                {isLoginView && (
                    <Link
                    href="#"
                    className="ml-auto inline-block text-sm underline"
                    onClick={(e) => { e.preventDefault(); alert("Feature not implemented yet."); }}
                    >
                    Forgot your password?
                    </Link>
                )}
              </div>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (isLoginView ? 'Logging in...' : 'Signing up...') : (isLoginView ? 'Login' : 'Sign Up')}
            </Button>
            <Button variant="outline" className="w-full" disabled>
              Login with Google
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {isLoginView ? "Don't have an account?" : "Already have an account?"}{" "}
            <Link href="#" className="underline" onClick={(e) => {
                e.preventDefault();
                setIsLoginView(!isLoginView);
                setEmail('');
                setPassword('');
            }}>
              {isLoginView ? 'Sign up' : 'Login'}
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:block">
        {loginImage && (
            <Image
                src={loginImage.imageUrl}
                alt={loginImage.description}
                width="1920"
                height="1080"
                className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                data-ai-hint={loginImage.imageHint}
            />
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <FirebaseClientProvider>
      <LoginPageContent />
    </FirebaseClientProvider>
  );
}
