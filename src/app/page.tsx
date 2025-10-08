'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppLogo } from '@/components/icons';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  User as FirebaseUser,
} from 'firebase/auth';
import { ThemeToggle } from '@/components/theme-toggle';
import { doc, setDoc, serverTimestamp, getDoc, Timestamp } from 'firebase/firestore';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useTheme } from 'next-themes';
import { User } from '@/lib/types';


function LoginPageContent() {
  const loginImage = PlaceHolderImages.find((p) => p.id === 'login-bg');
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { setTheme } = useTheme();

  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    const fetchUserTheme = async () => {
      if (user && firestore) {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          if (userData.themePreference) {
            setTheme(userData.themePreference);
          }
        }
      }
    };

    if (user) {
      fetchUserTheme();
      router.push('/dashboard');
    }
  }, [user, firestore, router, setTheme]);

  const handleCreateUserDocument = async (firebaseUser: FirebaseUser) => {
    if (!firestore) return;
    const userDocRef = doc(firestore, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
        const isAdmin = firebaseUser.email === 'admin@example.com';
        const userData: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'New User',
            role: isAdmin ? 'Admin' : 'Operator', // Assign 'Admin' role to specific email
            createdAt: serverTimestamp() as Timestamp,
            themePreference: 'system',
        };
        // Use setDoc to create the document.
        await setDoc(userDocRef, userData);
    }
  };
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setIsLoading(true);
    signInWithEmailAndPassword(auth, email, password)
        .catch((error: any) => {
            toast({
                variant: 'destructive',
                title: 'Login Failed',
                description:
                error.code === 'auth/invalid-credential'
                    ? 'Invalid email or password.'
                    : error.message,
            });
        })
        .finally(() => setIsLoading(false));
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: 'Passwords do not match.',
      });
      return;
    }
    if (!auth || !firestore) return;
    setIsLoading(true);

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await handleCreateUserDocument(userCredential.user);
    } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Sign Up Failed',
          description: error.message || 'Could not create account.',
        });
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    if (!auth) return;
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await handleCreateUserDocument(result.user);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Google Sign-In Failed',
        description: error.message || 'Could not sign in with Google.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isUserLoading || user) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
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
              {isLoginView
                ? 'Enter your credentials to access your account'
                : 'Create a new account to get started'}
            </p>
          </div>
          <form
            onSubmit={isLoginView ? handleLogin : handleSignUp}
            className="grid gap-4"
          >
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
                    onClick={(e) => {
                      e.preventDefault();
                      toast({ title: "Feature Coming Soon", description: "Password reset is not yet implemented."});
                    }}
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
            {!isLoginView && (
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading
                ? isLoginView
                  ? 'Logging in...'
                  : 'Creating Account...'
                : isLoginView
                ? 'Login'
                : 'Create an account'}
            </Button>
            <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading} type="button">
              {isLoading ? '...' : 'Login with Google'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {isLoginView ? "Don't have an account?" : 'Already have an account?'}{' '}
            <Link
              href="#"
              className="underline"
              onClick={(e) => {
                e.preventDefault();
                setIsLoginView(!isLoginView);
                setEmail('');
                setPassword('');
                setConfirmPassword('');
              }}
            >
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
