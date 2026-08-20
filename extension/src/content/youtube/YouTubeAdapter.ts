import { PlatformAdapter } from '../adapterInterface';
import { ContentContext, CommentContext } from '../../shared/types';

// Helper to generate a stable comment ID
function generateHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export class YouTubeAdapter implements PlatformAdapter {
  // Store DOM references mapping commentId -> DOM elements for reply insertion
  private commentElementsMap: Map<string, {
    commentNode: HTMLElement;
    replyButton: HTMLElement | null;
  }> = new Map();

  async getCurrentContent(): Promise<ContentContext | null> {
    // Determine if watch page or studio
    const isStudio = window.location.hostname.includes('studio.youtube.com');
    
    if (isStudio) {
      // YouTube Studio Comments page:
      // Try to find the channel name or active video title filter
      let title = 'YouTube Studio - Community';
      const videoFilterText = document.querySelector('ytcp-chip[label*="Video:"]') || 
                            document.querySelector('.video-title') ||
                            document.querySelector('ytcp-comment-video-thumbnail a');
      
      if (videoFilterText) {
        title = videoFilterText.textContent?.trim() || title;
      }
      
      return {
        title,
        description: 'YouTube Studio Community comments management',
        url: window.location.href
      };
    } else {
      // Normal YouTube Watch Page:
      const titleEl = document.querySelector('h1.ytd-watch-metadata') || 
                      document.querySelector('h1.title ytd-video-primary-info-renderer') ||
                      document.querySelector('ytd-watch-metadata h1');
      
      const descEl = document.querySelector('#description-inline-expander') || 
                     document.querySelector('#description');
      
      if (!titleEl) return null;
      
      return {
        title: titleEl.textContent?.trim() || 'Unknown Video',
        description: descEl?.textContent?.trim()?.slice(0, 200) || '',
        url: window.location.href
      };
    }
  }

  async getComments(limit: number): Promise<CommentContext[]> {
    this.commentElementsMap.clear();
    const isStudio = window.location.hostname.includes('studio.youtube.com');
    
    if (isStudio) {
      return this.getStudioComments(limit);
    } else {
      return this.getWatchPageComments(limit);
    }
  }

  private getStudioComments(limit: number): CommentContext[] {
    const comments: CommentContext[] = [];
    
    // YouTube Studio Comment threads container selector
    // ytcp-comment-thread is the container row representing a comment thread.
    const threadElements = document.querySelectorAll('ytcp-comment-thread');
    
    for (let i = 0; i < threadElements.length; i++) {
      if (comments.length >= limit) break;
      
      const threadNode = threadElements[i] as HTMLElement;
      
      // Top-level comment resides inside thread, tag ytcp-comment
      const commentNode = threadNode.querySelector('ytcp-comment') as HTMLElement;
      if (!commentNode) continue;
      
      // Check if it already has replies (responses)
      // If we see replies count indicator (e.g. "View replies" or specific text/elements showing existing reply)
      const repliesCountEl = threadNode.querySelector('.replies-count') || 
                             threadNode.querySelector('#replies-count') ||
                             threadNode.querySelector('ytcp-button[label*="replies"]') ||
                             threadNode.querySelector('#view-replies');
                             
      // In YouTube Studio, if a comment is already replied to, there is usually a list of sub-comments
      // or replies render inside the thread. We check if there is an existing sub-comment.
      const hasReplies = threadNode.querySelectorAll('ytcp-comment').length > 1 || 
                          (repliesCountEl && repliesCountEl.textContent && parseInt(repliesCountEl.textContent) > 0);
      
      if (hasReplies) {
        // Skip already answered top level comments
        continue;
      }
      
      // Extract author
      const authorEl = commentNode.querySelector('#author-name') || 
                       commentNode.querySelector('.author-name') ||
                       commentNode.querySelector('.author-text');
      const author = authorEl?.textContent?.trim() || 'Anonymous';
      
      // Extract avatar
      const avatarEl = commentNode.querySelector('#author-thumbnail img') as HTMLImageElement;
      const avatar = avatarEl?.src || undefined;
      
      // Extract text
      const textEl = commentNode.querySelector('#comment-text') || 
                     commentNode.querySelector('.comment-text') ||
                     commentNode.querySelector('#content-text');
      const text = textEl?.textContent?.trim() || '';
      
      if (!text) continue;
      
      // Extract related content title for this comment in YouTube Studio
      // In studio comment rows, there is a video thumbnail column containing the video link/title
      const videoTitleEl = threadNode.querySelector('.video-title') || 
                           threadNode.querySelector('ytcp-comment-video-thumbnail a') ||
                           document.querySelector('ytcp-chip[label*="Video:"]');
      const contentTitle = videoTitleEl?.textContent?.trim() || 'Active Video';
      
      // Extract Reply button
      const replyButton = commentNode.querySelector('#reply-button') ||
                          commentNode.querySelector('ytcp-button[label="Reply"]') ||
                          commentNode.querySelector('[aria-label="Reply"]') as HTMLElement;
      
      // Calculate ID
      const rawId = `youtube-studio-${author}-${text.slice(0, 30)}-${contentTitle}`;
      const id = generateHash(rawId);
      
      comments.push({
        id,
        author,
        avatar,
        text,
        contentTitle,
        requiresReply: true
      });
      
      this.commentElementsMap.set(id, {
        commentNode,
        replyButton: replyButton as HTMLElement
      });
    }
    
    return comments;
  }

  private getWatchPageComments(limit: number): CommentContext[] {
    const comments: CommentContext[] = [];
    const threadElements = document.querySelectorAll('ytd-comment-thread-renderer');
    
    const pageTitle = document.querySelector('h1.ytd-watch-metadata')?.textContent?.trim() || 'Current Video';
    
    for (let i = 0; i < threadElements.length; i++) {
      if (comments.length >= limit) break;
      
      const threadNode = threadElements[i] as HTMLElement;
      const commentNode = threadNode.querySelector('ytd-comment-renderer#comment') as HTMLElement;
      if (!commentNode) continue;
      
      // Check for nested replies in the DOM
      const replyRenderer = threadNode.querySelector('#replies');
      const hasExistingReplies = replyRenderer && replyRenderer.children.length > 0;
      
      if (hasExistingReplies) {
        continue;
      }
      
      // Extract details
      const authorEl = commentNode.querySelector('#author-text') || commentNode.querySelector('#author-name');
      const author = authorEl?.textContent?.trim() || 'Anonymous';
      
      const avatarEl = commentNode.querySelector('#author-thumbnail img') as HTMLImageElement;
      const avatar = avatarEl?.src || undefined;
      
      const textEl = commentNode.querySelector('#content-text');
      const text = textEl?.textContent?.trim() || '';
      
      if (!text) continue;
      
      // Reply button
      const replyButton = commentNode.querySelector('#reply-button-end') || 
                          commentNode.querySelector('[aria-label="Reply"]') ||
                          commentNode.querySelector('ytd-button-renderer[button-next]');
      
      const rawId = `youtube-watch-${author}-${text.slice(0, 30)}-${pageTitle}`;
      const id = generateHash(rawId);
      
      comments.push({
        id,
        author,
        avatar,
        text,
        contentTitle: pageTitle,
        requiresReply: true
      });
      
      this.commentElementsMap.set(id, {
        commentNode,
        replyButton: replyButton as HTMLElement
      });
    }
    
    return comments;
  }

  async insertReply(commentId: string, replyText: string): Promise<boolean> {
    const entry = this.commentElementsMap.get(commentId);
    if (!entry) {
      console.warn(`No cached DOM elements found for comment ${commentId}`);
      return false;
    }
    
    const { commentNode, replyButton } = entry;
    
    try {
      // 1. Click Reply Button if it exists and is not expanded
      if (replyButton) {
        replyButton.click();
        // Wait for reply box to render (usually dynamic)
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      
      // 2. Find reply input element (either in Studio or Watch Page)
      // Usually it's ytcp-comment-reply-textarea, or a contenteditable div
      const inputEl = commentNode.querySelector('div[contenteditable="true"]') ||
                      commentNode.querySelector('#contenteditable-root') ||
                      commentNode.querySelector('textarea') ||
                      commentNode.querySelector('[role="textbox"]');
      
      if (!inputEl) {
        console.error('Could not find reply input area inside the comment node.');
        return false;
      }
      
      // Scroll into view
      inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // 3. Set text depending on input element type
      if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
        const nativeInput = inputEl as HTMLTextAreaElement | HTMLInputElement;
        nativeInput.value = replyText;
        // Trigger React/Angular/Polymer events
        nativeInput.dispatchEvent(new Event('input', { bubbles: true }));
        nativeInput.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        // Contenteditable div
        const editableEl = inputEl as HTMLDivElement;
        editableEl.focus();
        
        // Execute insertText command so that Polymer/React register the edit event correctly
        // This is much safer than just innerText = replyText
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(editableEl);
        selection?.removeAllRanges();
        selection?.addRange(range);
        
        document.execCommand('insertText', false, replyText);
        
        // Fallback if execCommand doesn't work
        if (editableEl.innerText !== replyText) {
          editableEl.innerText = replyText;
          editableEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      
      return true;
    } catch (err) {
      console.error('Error inserting reply:', err);
      return false;
    }
  }
}
