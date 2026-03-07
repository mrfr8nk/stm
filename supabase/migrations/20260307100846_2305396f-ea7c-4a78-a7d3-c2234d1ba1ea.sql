
-- Allow conversation members to update their conversations
CREATE POLICY "Members can update conversations" ON public.conversations
  FOR UPDATE TO authenticated
  USING (is_conversation_member(auth.uid(), id))
  WITH CHECK (is_conversation_member(auth.uid(), id));

-- Drop and recreate message INSERT policy to be more permissive for sender
DROP POLICY IF EXISTS "Users can send messages to own conversations" ON public.messages;
CREATE POLICY "Users can send messages to own conversations" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());
