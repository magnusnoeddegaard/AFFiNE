import type {
  ChatStatus,
  HistoryMessage,
} from '../../blocksuite/ai/components/ai-chat-messages';
import type { AIError } from '../../blocksuite/ai/provider';

export type ChatContextValue = {
  // history messages of the chat
  messages: HistoryMessage[];
  status: ChatStatus;
  error: AIError | null;
  // plain-text of the selected content
  quote: string;
  // markdown of the selected content
  markdown: string;
  // images uploaded by the user
  images: File[];
  abortController: AbortController | null;
};