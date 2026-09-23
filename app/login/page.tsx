'use client';

import { useActionState } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login } from './actions';

const initialState = { error: '' };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.error === '' && state !== initialState) {
      router.push('/dashboard');
    }
  }, [state, router]);

  return (
    <form action={formAction}>
      <input type="text" name="email" placeholder="Username" required />
      <input type="password" name="password" placeholder="Password" required />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Logging in...' : 'Log in'}
      </button>
      {state.error && <p style={{ color: 'red' }}>{state.error}</p>}
    </form>
  );
}