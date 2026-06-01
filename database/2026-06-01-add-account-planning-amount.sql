alter table accounts
add column if not exists planning_amount numeric(14, 2) null;
