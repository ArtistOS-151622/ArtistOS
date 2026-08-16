ALTER TABLE user_subscriptions
ADD COLUMN next_billing_at TIMESTAMPTZ,
ADD COLUMN subscription_end_at TIMESTAMPTZ;
