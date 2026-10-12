import type { AiStreamEvent } from '@/types/ai-assistant';

/**
 * Đọc body SSE (`event: x\ndata: {...}\n\n`) từ fetch và gọi `onEvent` cho
 * từng event. Dừng khi stream kết thúc hoặc `signal` bị abort.
 */
export const readSseStream = async (
  body: ReadableStream<Uint8Array>,
  onEvent: (event: AiStreamEvent) => void
): Promise<void> => {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const flushBlock = (block: string) => {
    const lines = block.split('\n');
    const dataLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    }
    if (dataLines.length === 0) return;
    try {
      const parsed = JSON.parse(dataLines.join('\n')) as AiStreamEvent;
      if (parsed && typeof parsed === 'object' && 'type' in parsed) {
        onEvent(parsed);
      }
    } catch {
      // Bỏ qua block không parse được (không làm hỏng cả stream).
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let separator = buffer.indexOf('\n\n');
      while (separator !== -1) {
        const block = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        flushBlock(block);
        separator = buffer.indexOf('\n\n');
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) flushBlock(buffer);
  } finally {
    reader.releaseLock();
  }
};
