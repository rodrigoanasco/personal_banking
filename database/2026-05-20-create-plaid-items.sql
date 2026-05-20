create table if not exists plaid_items (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    item_id text not null,
    access_token text not null,
    institution_id text null,
    institution_name text null,
    transactions_cursor text null,
    created_at timestamp without time zone not null,
    updated_at timestamp without time zone not null
);

create unique index if not exists ix_plaid_items_user_item
on plaid_items (user_id, item_id);

create index if not exists ix_plaid_items_user_id
on plaid_items (user_id);
