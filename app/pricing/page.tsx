'use client';

import { useEffect, useRef, useState } from 'react';
import { useAction, useConvexAuth } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const handledReturn = useRef(false);

  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const verifyAndActivate = useAction(api.paypal.verifyAndActivate);

  async function subscribeToPro() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/paypal/subscribe', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to start checkout.');
      }

      if (!data.approvalUrl) {
        throw new Error('PayPal did not return an approval link.');
      }

      window.location.assign(data.approvalUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paypalStatus = params.get('paypal');

    if (paypalStatus === 'cancel') {
      const timeoutId = window.setTimeout(() => {
        setError('PayPal checkout was canceled.');
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    if (paypalStatus !== 'return' || handledReturn.current) {
      return;
    }

    const subscriptionId = params.get('subscription_id') ?? params.get('token');

    if (!subscriptionId) {
      handledReturn.current = true;

      const timeoutId = window.setTimeout(() => {
        setError('PayPal returned without a subscription ID.');
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      const timeoutId = window.setTimeout(() => {
        setError(
          'You must be signed in to verify your subscription. Please sign in and return to this page.',
        );
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    const validSubscriptionId: string = subscriptionId;
    handledReturn.current = true;

    const timeoutId = window.setTimeout(() => {
      setVerifying(true);
      setError('');
      setSuccess('');

      void verifyAndActivate({ subscriptionId: validSubscriptionId })
        .then(() => {
          setSuccess('Your Pro subscription is active!');
        })
        .catch((err: unknown) => {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to verify your subscription.',
          );
          handledReturn.current = false;
        })
        .finally(() => {
          setVerifying(false);
        });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [authLoading, isAuthenticated, verifyAndActivate]);

  return (
    <main className='mx-auto max-w-5xl px-6 py-16'>
      <div className='text-center'>
        {verifying && (
          <p
            role='status'
            className='mb-6'
          >
            Verifying your PayPal subscription...
          </p>
        )}

        {success && (
          <p
            role='status'
            className='mb-6 text-green-700'
          >
            {success}
          </p>
        )}

        {error && (
          <p
            role='alert'
            className='mb-6 text-red-600'
          >
            {error}
          </p>
        )}

        <h1 className='text-4xl font-bold tracking-tight'>
          Simple, transparent pricing
        </h1>

        <p className='mt-4 text-gray-600'>
          Start free and upgrade when your work grows.
        </p>
      </div>

      <div className='mt-12 grid gap-8 md:grid-cols-2'>
        <section className='rounded-2xl border p-8'>
          <h2 className='text-2xl font-semibold'>Free</h2>

          <p className='mt-4 text-4xl font-bold'>$0</p>
          <p className='mt-2 text-sm text-gray-500'>Forever</p>

          <ul className='mt-8 space-y-4 text-sm'>
            <li>✓ 1 workspace</li>
            <li>✓ 3 projects per workspace</li>
            <li>✓ 20 tasks per project</li>
          </ul>
        </section>

        <section className='rounded-2xl border-2 border-blue-600 p-8'>
          <h2 className='text-2xl font-semibold'>Pro</h2>

          <p className='mt-4 text-4xl font-bold'>€10</p>
          <p className='mt-2 text-sm text-gray-500'>
            Per month · Sandbox testing
          </p>

          <ul className='mt-8 space-y-4 text-sm'>
            <li>✓ Unlimited workspaces</li>
            <li>✓ Unlimited projects</li>
            <li>✓ Unlimited tasks</li>
          </ul>

          <button
            type='button'
            onClick={subscribeToPro}
            disabled={loading || verifying}
            className='mt-8 w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60'
          >
            {loading ? 'Connecting to PayPal...' : 'Subscribe to Pro'}
          </button>
        </section>
      </div>
    </main>
  );
}
