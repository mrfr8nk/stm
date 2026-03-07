INSERT INTO public.access_codes (code, role, used, created_by)
VALUES ('ADMIN2025', 'admin', false, null)
ON CONFLICT DO NOTHING;