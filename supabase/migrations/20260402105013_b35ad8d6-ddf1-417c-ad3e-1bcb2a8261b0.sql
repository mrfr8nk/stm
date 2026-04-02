
-- Trigger function: notify all admins when a new application is submitted
CREATE OR REPLACE FUNCTION public.notify_admins_on_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  FOR admin_record IN 
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      admin_record.user_id,
      'New Student Application',
      'A new application has been submitted by ' || NEW.full_name || ' (' || NEW.email || ')',
      'info'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

-- Trigger on applications table
CREATE TRIGGER on_application_insert
  AFTER INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_application();

-- Trigger function: notify admins on fee payment
CREATE OR REPLACE FUNCTION public.notify_admins_on_fee_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_record RECORD;
  student_name TEXT;
BEGIN
  SELECT full_name INTO student_name FROM public.profiles WHERE user_id = NEW.student_id LIMIT 1;
  FOR admin_record IN 
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      admin_record.user_id,
      'Fee Payment Received',
      'Payment of $' || NEW.amount_usd || ' received from ' || COALESCE(student_name, 'a student'),
      'success'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_fee_payment_insert
  AFTER INSERT ON public.fee_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_fee_payment();

-- Trigger: notify admins when a new user signs up (profile created)
CREATE OR REPLACE FUNCTION public.notify_admins_on_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  FOR admin_record IN 
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      admin_record.user_id,
      'New User Registered',
      NEW.full_name || ' (' || COALESCE(NEW.email, '') || ') has registered an account',
      'info'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_new_user();
