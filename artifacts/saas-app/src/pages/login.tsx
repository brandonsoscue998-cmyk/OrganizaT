import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { setToken } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";
import { t } from "@/lib/i18n";

const loginSchema = z.object({
  email: z.string().email(t.auth.emailInvalid),
  password: z.string().min(1, t.auth.passwordRequired),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const login = useLogin();

  const { register, handleSubmit, formState: { errors }, setError } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const result = await login.mutateAsync({ data });
      setToken(result.token);
      setLocation(result.user.role === "client" ? "/client" : "/dashboard");
    } catch (err: unknown) {
      const error = err as { data?: { error?: string } };
      setError("root", { message: error?.data?.error ?? t.auth.loginError });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2.5 mb-1">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground text-sm font-bold leading-none">OT</span>
            </div>
            <span className="text-2xl font-bold tracking-tight">Organiza<span className="text-primary">T</span></span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">{t.app.tagline}</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t.auth.loginTitle}</CardTitle>
            <CardDescription>{t.auth.loginDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">{t.auth.email}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t.auth.emailPlaceholder}
                  autoComplete="email"
                  {...register("email")}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">{t.auth.password}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t.auth.passwordPlaceholder}
                  autoComplete="current-password"
                  {...register("password")}
                  className={errors.password ? "border-destructive" : ""}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
              {errors.root && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                  <p className="text-sm text-destructive">{errors.root.message}</p>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={login.isPending}>
                {login.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t.auth.loginButton}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              {t.auth.noAccount}{" "}
              <Link href="/register" className="text-primary hover:underline font-medium">
                {t.auth.signUp}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
