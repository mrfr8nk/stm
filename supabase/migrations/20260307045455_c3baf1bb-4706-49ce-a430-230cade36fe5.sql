
ALTER TABLE public.fee_records ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash';
ALTER TABLE public.fee_records ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';
ALTER TABLE public.fee_records ADD COLUMN IF NOT EXISTS zig_amount numeric DEFAULT 0;
