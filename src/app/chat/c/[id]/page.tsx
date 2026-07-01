import { ChatPane } from '@/components/chat/chat-pane';

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChatPane conversationId={id} />;
}
