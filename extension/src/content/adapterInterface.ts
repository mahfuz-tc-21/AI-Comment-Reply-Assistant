import { ContentContext, CommentContext } from '../shared/types';

export interface PlatformAdapter {
  getCurrentContent(): Promise<ContentContext | null>;
  getComments(limit: number): Promise<CommentContext[]>;
  insertReply(commentId: string, replyText: string): Promise<boolean>;
}
