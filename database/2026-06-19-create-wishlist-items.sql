create table if not exists wishlist_items (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    name text not null,
    description text null,
    category text not null default 'Extra',
    url text null,
    price numeric(14, 2) not null default 0,
    currency varchar(3) not null default 'CAD',
    priority integer not null default 3 check (priority between 1 and 5),
    saved_amount numeric(14, 2) not null default 0,
    target_date date null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

create index if not exists ix_wishlist_items_user_category_priority
on wishlist_items(user_id, category, priority, name);
