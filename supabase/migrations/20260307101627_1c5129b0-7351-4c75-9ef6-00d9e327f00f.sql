
CREATE OR REPLACE FUNCTION public.create_direct_conversation(_recipient_id uuid, _title text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sender_id uuid := auth.uid();
  _existing_id uuid;
  _new_id uuid;
BEGIN
  IF _sender_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF _recipient_id IS NULL THEN
    RAISE EXCEPTION 'Recipient is required';
  END IF;

  IF _recipient_id = _sender_id THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;

  SELECT c.id INTO _existing_id
  FROM public.conversations c
  JOIN public.conversation_participants p1 ON p1.conversation_id = c.id AND p1.user_id = _sender_id
  JOIN public.conversation_participants p2 ON p2.conversation_id = c.id AND p2.user_id = _recipient_id
  WHERE c.type = 'direct'
  LIMIT 1;

  IF _existing_id IS NOT NULL THEN
    UPDATE public.conversations
    SET updated_at = now()
    WHERE id = _existing_id;
    RETURN _existing_id;
  END IF;

  _new_id := gen_random_uuid();

  INSERT INTO public.conversations (id, title, type)
  VALUES (_new_id, _title, 'direct');

  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (_new_id, _sender_id), (_new_id, _recipient_id);

  RETURN _new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_direct_conversation(uuid, text) TO authenticated;
