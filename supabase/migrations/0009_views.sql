create view v_live_pool as
  select corridor_id, direction, anchor_id, count(*) filter (where state='QUEUED') as queued,
         min(queued_at) filter (where state='QUEUED') as oldest_queued_at
  from ride_requests group by 1,2,3;

create view v_daily_kpis as
  select date_trunc('day', completed_at at time zone 'Africa/Lagos') as day,
         corridor_id,
         count(*) as trips, sum(gross_kobo) as gmv_kobo, sum(commission_kobo) as take_kobo,
         sum(driver_net_kobo) as driver_earnings_kobo,
         avg(extract(epoch from (departed_at - arrived_at))) as avg_boarding_s,
         count(*) * 125000 as est_agbero_fees_avoided_kobo     -- 1,250 NGN midpoint of 1,000-1,500 NGN
  from pods where state = 'COMPLETED' group by 1, 2;

create view v_ledger_trial_balance as
  select sum(amount_kobo) as must_be_zero from ledger_entries;
