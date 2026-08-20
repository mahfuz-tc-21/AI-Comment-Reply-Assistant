import { PlatformAdapter } from '../adapterInterface';
import { ContentContext, CommentContext } from '../../shared/types';

function generateHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export class MetaAdapter implements PlatformAdapter {
  private commentElementsMap: Map<string, {
    commentNode: HTMLElement;
    replyButton: HTMLElement | null;
  }> = new Map();

  async getCurrentContent(): Promise<ContentContext | null> {
    // 1. Locate the main post caption / text
    // Facebook/Meta Business Suite Inbox post preview selectors:
    const postSelectors = [
      '[data-testid="post_message"]',
      '.post-content',
      '.post-text',
      '[role="article"] p',
      // Fallback: look for the header/original post area text in the right/detail panel
      '.x1y1aw1k.xwib8y2', // example of dynamic meta classes
      'div[dir="auto"]'
    ];

    let postText = '';
    for (const selector of postSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent) {
        postText = el.textContent.trim();
        if (postText.length > 10) break;
      }
    }

    // If nothing found, try to search for the post header in common layout containers
    if (!postText) {
      // Find the first large block of text in the post details panel
      const detailPanel = document.querySelector('[role="main"]') || document.querySelector('.x1n2onr6');
      if (detailPanel) {
        const paragraphs = detailPanel.querySelectorAll('p, span[dir="auto"]');
        for (let i = 0; i < paragraphs.length; i++) {
          const text = paragraphs[i].textContent?.trim();
          if (text && text.length > 20) {
            postText = text;
            break;
          }
        }
      }
    }

    return {
      title: postText.slice(0, 80) || 'Meta Business Suite Post',
      description: postText || 'Facebook post comments thread',
      url: window.location.href
    };
  }

  async getComments(limit: number): Promise<CommentContext[]> {
    this.commentElementsMap.clear();
    const comments: CommentContext[] = [];

    // Selectors for comment items
    // Meta comments are often items with role="article" or custom comment containers
    const commentSelectors = [
      '[role="article"]',
      '.comment-container',
      '.x168nmei', // React static elements in Business Suite
      'div[data-testid="comment_container"]'
    ];

    let commentNodes: NodeListOf<Element> | null = null;
    for (const selector of commentSelectors) {
      const nodes = document.querySelectorAll(selector);
      // Filter out elements that don't look like single comments (e.g. posts, headers)
      if (nodes.length > 0) {
        commentNodes = nodes;
        break;
      }
    }

    if (!commentNodes) {
      // Fallback: search for elements with reply buttons
      const replyButtons = document.querySelectorAll('button, span, a');
      const possibleCommentNodes: HTMLElement[] = [];
      replyButtons.forEach((btn) => {
        const txt = btn.textContent?.toLowerCase() || '';
        if (txt === 'reply' || txt === 'উত্তর দিন' || txt === 'respond') {
          // The comment container is likely a grandparent
          const parent = btn.parentElement?.parentElement?.parentElement;
          if (parent && !possibleCommentNodes.includes(parent)) {
            possibleCommentNodes.push(parent);
          }
        }
      });
      if (possibleCommentNodes.length > 0) {
        commentNodes = possibleCommentNodes as any;
      }
    }

    if (!commentNodes) return [];

    const pageContext = await this.getCurrentContent();
    const contentTitle = pageContext?.title || 'Active Post';

    for (let i = 0; i < commentNodes.length; i++) {
      if (comments.length >= limit) break;

      const commentNode = commentNodes[i] as HTMLElement;

      // Ensure it is a top-level comment and not a nested reply
      // In Facebook, replies are usually inside a nested list, or indented with margin/padding,
      // or inside a specific replies container like `.x1n2onr6` with lower depth.
      const isNested = commentNode.closest('.replies-container') ||
                       commentNode.closest('[style*="margin-left"]') ||
                       commentNode.closest('.x13faqbe'); // dynamic reply indent selector
      
      if (isNested) {
        continue;
      }

      // Check if already replied to
      // In Meta Business Suite, if you have already replied, there's usually a sub-comment under it
      // authored by the Page or a reply thread containing the Page name.
      // For MVP, we can also check if the UI contains a "replied" tag or if the reply list has children
      const hasSubComments = commentNode.querySelectorAll('[role="article"]').length > 1;
      if (hasSubComments) {
        continue;
      }

      // Extract author
      const authorEl = commentNode.querySelector('a') ||
                       commentNode.querySelector('strong') ||
                       commentNode.querySelector('.x1i10hfl'); // dynamic name link
      const author = authorEl?.textContent?.trim() || 'Facebook User';

      // Extract avatar
      const avatarEl = commentNode.querySelector('img') as HTMLImageElement;
      const avatar = avatarEl?.src || undefined;

      // Extract comment text
      // Usually comments have a separate span or div containing the actual text
      // We look for spans that contain text other than name, time, and reply/like actions.
      let text = '';
      const textContainers = commentNode.querySelectorAll('span, div[dir="auto"]');
      for (let j = 0; j < textContainers.length; j++) {
        const textVal = textContainers[j].textContent?.trim() || '';
        if (
          textVal &&
          textVal.length > 0 &&
          textVal !== author &&
          textVal.toLowerCase() !== 'reply' &&
          textVal.toLowerCase() !== 'like' &&
          textVal.toLowerCase() !== 'উত্তর দিন' &&
          !textVal.includes('hr') &&
          !textVal.includes('min') &&
          !textVal.includes('d')
        ) {
          text = textVal;
          break;
        }
      }

      if (!text) continue;

      // Find Reply button
      let replyButton: HTMLElement | null = null;
      const buttons = commentNode.querySelectorAll('button, span, a');
      for (let k = 0; k < buttons.length; k++) {
        const btnText = buttons[k].textContent?.toLowerCase() || '';
        if (btnText === 'reply' || btnText === 'উত্তর দিন' || btnText === 'respond') {
          replyButton = buttons[k] as HTMLElement;
          break;
        }
      }

      const rawId = `meta-${author}-${text.slice(0, 30)}-${contentTitle}`;
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
        replyButton
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
      // 1. Click Reply Button if it exists
      if (replyButton) {
        replyButton.click();
        await new Promise((resolve) => setTimeout(resolve, 600)); // wait for reply box
      }

      // 2. Find reply input element (either contenteditable div or textarea)
      // Meta uses draft.js / contenteditable divs for their input boxes.
      const inputEl = commentNode.querySelector('div[contenteditable="true"]') ||
                      commentNode.querySelector('[role="textbox"]') ||
                      commentNode.querySelector('textarea');

      if (!inputEl) {
        // Fallback: look globally in case it opens a single editor at the bottom for the comment
        const globalInput = document.querySelector('div[contenteditable="true"]') ||
                            document.querySelector('textarea[placeholder*="reply"]');
        if (globalInput) {
          globalInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (globalInput as HTMLElement).focus();
          this.writeTextToInput(globalInput as HTMLElement, replyText);
          return true;
        }
        console.error('Could not find reply input area for Meta comment.');
        return false;
      }

      inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.writeTextToInput(inputEl as HTMLElement, replyText);
      return true;
    } catch (err) {
      console.error('Error inserting Meta reply:', err);
      return false;
    }
  }

  private writeTextToInput(element: HTMLElement, text: string) {
    element.focus();
    
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      const nativeInput = element as HTMLTextAreaElement | HTMLInputElement;
      nativeInput.value = text;
      nativeInput.dispatchEvent(new Event('input', { bubbles: true }));
      nativeInput.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      // Draft.js / Rich Editor contenteditable
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      selection?.removeAllRanges();
      selection?.addRange(range);
      
      document.execCommand('insertText', false, text);
      
      if (element.innerText !== text) {
        element.innerText = text;
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }
}
