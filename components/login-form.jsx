'use client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, createSearchParams } from '@/lib/utils';
import { getDeviceId } from '@/lib/deviceId';
import SocialLogin from './SocialLogin';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { IconLoaderQuarter } from '@tabler/icons-react';
import Link from 'next/link';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export default function LoginForm({
  className,
  token,
  cid,
  type = 'client',
  ...props
}) {
  const router = useRouter();
  const session = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const isDooit = type === 'dooit';
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const getRoute = (session) => {
    if (token && cid) {
      return '/auth/registration-type';
    } else if (session.data?.user?.role === 'customer') {
      return '/customer/dashboard';
    } else if (
      session.data?.user?.userType === 'client' ||
      session.data?.user?.userType === 'branch' ||
      session.data?.user?.userType === 'dooit'
    ) {
      return '/dashboard/client';
    } else {
      return '/';
    }
  };

  useEffect(() => {
    if (session.data) {
      router.replace(getRoute(session));
    }
  }, [session.data?.user?.userType]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('email', data.email);
    formData.append('password', data.password);

    const res = await signIn('credentials', {
      ...data,
      userType: type,
      deviceId: getDeviceId(),
      redirect: false,
    });
    if (res.error) {
      toast.error(res.code || 'Something went wrong');
    } else {
      router.replace(getRoute(session));
    }

    setIsLoading(false);
  };
  const urlParams = createSearchParams({
    token,
    cid,
  });
  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>
            Login with your Apple or Google account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-6">
              {/* <SocialLogin /> */}

              <div className="grid gap-6">
                <Controller
                  control={control}
                  name="email"
                  render={({ field }) => (
                    <div className="grid gap-3">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="m@example.com"
                        value={field.value}
                        {...field}
                        error={errors.email?.message}
                      />
                    </div>
                  )}
                />
                <Controller
                  control={control}
                  name="password"
                  render={({ field }) => (
                    <div className="grid gap-3">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        {...field}
                        error={errors.password?.message}
                      />
                    </div>
                  )}
                />
                {isDooit ? null : (
                  <Link
                    href={`/auth/forget-password?${urlParams.toString()}`}
                    className="ml-auto text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                )}
                <Button className="w-full" type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <IconLoaderQuarter className="w-4 h-4 animate-spin " />
                      Processing...
                    </span>
                  ) : (
                    'Login'
                  )}
                </Button>
              </div>
              {/* <div className="text-center text-sm">
                Don&apos;t have an account?{' '}
                <Link
                  href={`/auth/register?${urlParams.toString()}`}
                  className="underline underline-offset-4"
                >
                  Sign up
                </Link>
              </div> */}
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{' '}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
