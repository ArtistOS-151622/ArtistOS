-- Completing a storage purchase used to be three separate round trips from the
-- app: read the purchase, flip its status to 'completed', then read-modify-write
-- portfolio_storage_quotas.purchase_storage_bytes. The browser /verify call and
-- the payment.captured webhook routinely arrive together, so both could observe
-- a non-completed purchase and each credit the quota once. The split also left a
-- window where the status flip succeeded but the quota credit failed, charging
-- the artist without granting storage and blocking any retry.
--
-- This function does both in a single transaction. The status predicate is the
-- lock: only the caller whose UPDATE actually claims the row goes on to credit
-- the quota.

create or replace function public.complete_storage_purchase(
  p_purchase_id bigint,
  p_rp_payment_id text default null,
  p_rp_subscription_id text default null,
  p_rp_event_id text default null,
  p_payment_method text default null,
  p_fallback_expires_at timestamptz default null
)
returns boolean
language plpgsql
as $$
declare
  v_purchase public.portfolio_storage_purchases;
begin
  update public.portfolio_storage_purchases p
  set
    status = 'completed',
    rp_payment_id = coalesce(p_rp_payment_id, p.rp_payment_id),
    rp_subscription_id = coalesce(p_rp_subscription_id, p.rp_subscription_id),
    rp_event_id = coalesce(p_rp_event_id, p.rp_event_id),
    payment_method = coalesce(p_payment_method, p.payment_method)
  where p.id = p_purchase_id
    and p.status <> 'completed'
  returning p.* into v_purchase;

  -- Already completed, or no such purchase: another caller got here first.
  if not found then
    return false;
  end if;

  -- An add-on bought while a plan is still running keeps the running expiry
  -- rather than restarting the clock. Decided here, against the locked row,
  -- so a concurrent credit can't read a stale expires_at.
  update public.portfolio_storage_quotas q
  set
    purchase_storage_bytes = q.purchase_storage_bytes + v_purchase.storage_bytes,
    expires_at = case
      when q.purchase_storage_bytes > 0
       and q.expires_at is not null
       and q.expires_at > now()
      then q.expires_at
      else coalesce(p_fallback_expires_at, now() + interval '30 days')
    end
  where q.user_id = v_purchase.user_id;

  -- Callers create the quota row first (the free-tier size is app config, not a
  -- SQL default). If it is missing, fail loudly so the status flip rolls back
  -- and the purchase stays retryable.
  if not found then
    raise exception 'No storage quota row for user %', v_purchase.user_id;
  end if;

  return true;
end;
$$;

grant execute on function public.complete_storage_purchase(
  bigint, text, text, text, text, timestamptz
) to anon, authenticated, service_role;
