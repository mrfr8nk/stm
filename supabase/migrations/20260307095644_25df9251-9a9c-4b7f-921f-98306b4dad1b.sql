
-- Messaging tables
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  type text NOT NULL DEFAULT 'direct',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Helper function (tables exist now)
CREATE OR REPLACE FUNCTION public.is_conversation_member(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE user_id = _user_id AND conversation_id = _conversation_id
  )
$$;

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversation policies
CREATE POLICY "Users can view own conversations" ON public.conversations
  FOR SELECT TO authenticated USING (is_conversation_member(auth.uid(), id));
CREATE POLICY "Authenticated can create conversations" ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins manage all conversations" ON public.conversations
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Participant policies
CREATE POLICY "Users can view own participations" ON public.conversation_participants
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can view co-participants" ON public.conversation_participants
  FOR SELECT TO authenticated USING (is_conversation_member(auth.uid(), conversation_id));
CREATE POLICY "Authenticated can add participants" ON public.conversation_participants
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins manage all participants" ON public.conversation_participants
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Message policies
CREATE POLICY "Users can view messages in own conversations" ON public.messages
  FOR SELECT TO authenticated USING (is_conversation_member(auth.uid(), conversation_id));
CREATE POLICY "Users can send messages to own conversations" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND is_conversation_member(auth.uid(), conversation_id));
CREATE POLICY "Admins manage all messages" ON public.messages
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Parent portal
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'parent';

CREATE TABLE IF NOT EXISTS public.parent_student_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  student_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own links" ON public.parent_student_links
  FOR SELECT TO authenticated USING (parent_id = auth.uid());
CREATE POLICY "Admins manage parent links" ON public.parent_student_links
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
