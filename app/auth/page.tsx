import { AuthForm } from "@/components/auth/auth-form";

export default function AuthPage() {
  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 max-w-md">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome to VIdia
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to save your video ideas and access them anywhere
          </p>
        </div>
        <AuthForm />
      </div>
    </div>
  );
}
