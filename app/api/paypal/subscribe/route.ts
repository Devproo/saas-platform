import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: 'Please sign in to subscribe.' },
      { status: 401 },
    );
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const baseUrl = process.env.PAYPAL_BASE_URL;
  const planId = process.env.PAYPAL_PRO_PLAN_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (
    !clientId ||
    !clientSecret ||
    !baseUrl?.includes('sandbox') ||
    !planId ||
    !appUrl
  ) {
    return NextResponse.json(
      { error: 'PayPal Sandbox configuration is incomplete.' },
      { status: 500 },
    );
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64',
    );

    const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      cache: 'no-store',
    });

    if (!tokenResponse.ok) {
      return NextResponse.json(
        { error: 'PayPal authentication failed.' },
        { status: 502 },
      );
    }

    const { access_token } = await tokenResponse.json();

    const subscriptionResponse = await fetch(
      `${baseUrl}/v1/billing/subscriptions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          plan_id: planId,
          custom_id: userId,
          application_context: {
            brand_name: 'Saas Platform',
            user_action: 'SUBSCRIBE_NOW',
            shipping_preference: 'NO_SHIPPING',
            return_url: `${appUrl}/pricing?paypal=return`,
            cancel_url: `${appUrl}/pricing?paypal=cancel`,
          },
        }),
        cache: 'no-store',
      },
    );

    const subscription = await subscriptionResponse.json();

    if (!subscriptionResponse.ok) {
      console.error(
        'PayPal subscription creation failed:',
        subscription.name,
        subscription.message,
      );

      return NextResponse.json(
        { error: 'Could not create the PayPal subscription.' },
        { status: 502 },
      );
    }

    const approvalUrl = subscription.links?.find(
      (link: { rel: string; href: string }) => link.rel === 'approve',
    )?.href;

    if (!approvalUrl) {
      return NextResponse.json(
        { error: 'PayPal did not return an approval link.' },
        { status: 502 },
      );
    }

    return NextResponse.json({
      subscriptionId: subscription.id,
      approvalUrl,
    });
  } catch {
    return NextResponse.json(
      { error: 'Unable to contact PayPal.' },
      { status: 502 },
    );
  }
}
