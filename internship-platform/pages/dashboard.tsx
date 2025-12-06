import { GetServerSideProps } from 'next';
import { createServerSupabaseClient } from '../lib/supabase';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const supabase = createServerSupabaseClient(ctx);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  return {
    props: {
      user: session.user,
    },
  };
};

export default function Dashboard({ user }: any) {
  return (
    <div className="p-6">
      <h1 className="text-2xl">Welcome, {user.email}</h1>
    </div>
  );
}

import { createClient } from '../lib/supabase';

const supabase = createClient();

const logout = async () => {
  await supabase.auth.signOut();
  window.location.href = '/login';
};

