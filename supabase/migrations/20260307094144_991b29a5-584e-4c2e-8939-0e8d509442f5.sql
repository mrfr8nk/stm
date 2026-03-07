
-- Add receipt_image_url to petty_cash and fee_records
ALTER TABLE public.petty_cash ADD COLUMN IF NOT EXISTS receipt_image_url text;
ALTER TABLE public.fee_records ADD COLUMN IF NOT EXISTS receipt_image_url text;

-- Create storage bucket for receipt proof images
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to receipts bucket
CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'receipts');

-- Allow anyone to view receipts
CREATE POLICY "Anyone can view receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts');

-- Allow admins to delete receipts
CREATE POLICY "Admins can delete receipts"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'receipts' AND public.has_role(auth.uid(), 'admin'));
