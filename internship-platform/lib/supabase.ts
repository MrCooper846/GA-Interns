import { createBrowserClient, createServerClient } from '@supabase/ssr';
import type { GetServerSidePropsContext } from 'next';

// Client-side Supabase client
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

// Server-side Supabase client (for getServerSideProps, API routes)
export const createServerSupabaseClient = (context: GetServerSidePropsContext) =>
  createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return context.req.cookies[name];
        },
        set(name: string, value: string, options: any) {
          context.res.setHeader('Set-Cookie', `${name}=${value}; ${options}`);
        },
        remove(name: string, options: any) {
          context.res.setHeader('Set-Cookie', `${name}=; Max-Age=0; ${options}`);
        },
      },
    }
  );