import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegister } from "@workspace/api-client-react";
import { setToken } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";
import { t } from "@/lib/i18n";

const registerSchema = z.object({
  name: z.string().min(2, t.auth.nameMin),
  email: z.string().email(t.auth.emailInvalid),
  password: z.string().min(6, t.auth.passwordMin),
  role: z.enum(["trainer", "client", "owner"]).default("trainer"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const register = useRegister();

  const { register: formRegister, handleSubmit, watch, setValue, formState: { errors }, setError } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "trainer" },
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: RegisterForm) => {
    try {
      const result = await register.mutateAsync({ data });
      setToken(result.token);
      setLocation(result.user.role === "client" ? "/client" : "/dashboard");
    } catch (err: unknown) {
      const error = err as { data?: { error?: string } };
      setError("root", { message: error?.data?.error ?? t.auth.registerError });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-2xl font-bold tracking-tight">{t.app.name}</div>
          <p className="text-muted-foreground text-sm mt-1">{t.app.tagline}</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t.auth.registerTitle}</CardTitle>
            <CardDescription>{t.auth.registerDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">{t.auth.fullName}</Label>
                <Input
                  id="name"
                  placeholder={t.auth.fullNamePlaceholder}
                  autoComplete="name"
                  {...formRegister("name")}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">{t.auth.email}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t.auth.emailPlaceholder}
                  autoComplete="email"
                  {...formRegister("email")}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">{t.auth.password}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t.auth.passwordMinPlaceholder}
                  autoComplete="new-password"
                  {...formRegister("password")}
                  className={errors.password ? "border-destructive" : ""}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>{t.auth.roleLabel}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "trainer", label: t.auth.roleTrainer },
                    { value: "client", label: t.auth.roleClient },
                    { value: "owner", label: t.auth.roleOwner },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValue("role", opt.value as "trainer" | "client" | "owner")}
                      className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors text-center ${selectedRole === opt.value ? "border-primary bg-primary/5 text-primary" : "border-input hover:bg-muted text-muted-foreground"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {errors.root && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                  <p className="text-sm text-destructive">{errors.root.message}</p>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={register.isPending}>
                {register.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t.auth.registerButton}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              {t.auth.hasAccount}{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                {t.auth.signIn}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
