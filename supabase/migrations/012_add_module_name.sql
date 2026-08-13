-- Add module_name column to orders table
-- This stores the exact module/unit name extracted from the brief
-- (e.g., 'Strategic Financial Management', 'Unit 1: Programming')

alter table public.orders
add column if not exists module_name text;

comment on column public.orders.module_name is 'Exact module or unit name extracted from the assignment brief';
