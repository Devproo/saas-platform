'use node';

import { v } from 'convex/values';
import { action } from './_generated/server';
import { internal } from './_generated/api';

export const verifyAndActivate = action({
  args: {
    subscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error('Please sign in to verify your subscription.');
    }

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const baseUrl = process.env.PAYPAL_BASE_URL;
    const expectedPlanId = process.env.PAYPAL_PRO_PLAN_ID;

    if (
      !clientId ||
      !clientSecret ||
      !baseUrl?.includes('sandbox') ||
      !expectedPlanId
    ) {
      throw new Error('PayPal Sandbox configuration is incomplete.');
    }

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
    });

    if (!tokenResponse.ok) {
      throw new Error('Could not authenticate with PayPal.');
    }

    const { access_token } = await tokenResponse.json();

    const response = await fetch(
      `${baseUrl}/v1/billing/subscriptions/${encodeURIComponent(args.subscriptionId)}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error('Could not verify the PayPal subscription.');
    }

    const subscription = await response.json();

    if (
      subscription.status !== 'ACTIVE' ||
      subscription.plan_id !== expectedPlanId ||
      subscription.custom_id !== identity.subject
    ) {
      throw new Error(
        'The subscription is not active or does not belong to this account.',
      );
    }

    const periodEnd = Date.parse(
      subscription.billing_info?.next_billing_time ?? '',
    );

    const periodStart = Date.parse(
      subscription.billing_info?.last_payment?.time ??
        subscription.start_time ??
        subscription.create_time ??
        '',
    );

    if (
      !Number.isFinite(periodStart) ||
      !Number.isFinite(periodEnd) ||
      periodEnd <= periodStart ||
      periodEnd <= Date.now()
    ) {
      throw new Error('PayPal did not return a valid billing period.');
    }

    await ctx.runMutation(internal.subscriptions.activateIndividualPro, {
      userId: identity.subject,
      providerSubscriptionId: subscription.id,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    });

    return { ok: true, plan: 'pro' as const };
  },
});
