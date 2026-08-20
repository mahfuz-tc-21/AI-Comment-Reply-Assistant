import { PlatformAdapter } from '../adapterInterface';
import { ContentContext, CommentContext } from '../../shared/types';

export class MockAdapter implements PlatformAdapter {
  private commentElementsMap: Map<string, {
    commentNode: HTMLElement;
    replyButton: HTMLElement | null;
  }> = new Map();

  async getCurrentContent(): Promise<ContentContext | null> {
    const titleEl = document.querySelector('.mock-content-title');
    const descEl = document.querySelector('.mock-content-desc');
    return {
      title: titleEl?.textContent?.trim() || 'Mock Interactive Sandbox',
      description: descEl?.textContent?.trim() || 'A sandbox environment for testing extraction, AI generation, and reply insertion without logging into YouTube or Facebook.',
      url: window.location.href
    };
  }

  async getComments(limit: number): Promise<CommentContext[]> {
    this.commentElementsMap.clear();
    const comments: CommentContext[] = [];
    
    const rows = document.querySelectorAll('.mock-comment-row');
    const content = await this.getCurrentContent();
    const contentTitle = content?.title || 'Mock Content';
    
    for (let i = 0; i < rows.length; i++) {
      if (comments.length >= limit) break;
      
      const row = rows[i] as HTMLElement;
      
      // Skip comments that have already been responded to if marked
      if (row.dataset.responded === 'true') {
        continue;
      }
      
      const id = row.dataset.id || `mock-${i}`;
      const author = row.querySelector('.mock-author')?.textContent?.trim() || 'Anonymous';
      const text = row.querySelector('.mock-text')?.textContent?.trim() || '';
      const avatar = (row.querySelector('.mock-avatar') as HTMLImageElement)?.src || undefined;
      
      const replyButton = row.querySelector('.mock-reply-btn') as HTMLElement;
      
      comments.push({
        id,
        author,
        avatar,
        text,
        contentTitle,
        requiresReply: true
      });
      
      this.commentElementsMap.set(id, {
        commentNode: row,
        replyButton
      });
    }
    
    return comments;
  }

  async insertReply(commentId: string, replyText: string): Promise<boolean> {
    const entry = this.commentElementsMap.get(commentId);
    if (!entry) return false;
    
    const { commentNode, replyButton } = entry;
    
    if (replyButton) {
      replyButton.click();
      await new Promise((r) => setTimeout(r, 100));
    }
    
    const input = commentNode.querySelector('.mock-reply-input') as HTMLTextAreaElement | HTMLInputElement;
    if (input) {
      input.value = replyText;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return true;
    }
    
    return false;
  }
}
