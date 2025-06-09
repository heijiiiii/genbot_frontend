import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  type SQL,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  message,
  vote,
  type DBMessage,
  type Chat,
} from './schema';
import type { ArtifactKind } from '@/components/artifact';
import { generateUUID } from '../utils';
import { generateHashedPassword } from './utils';
import { ENABLE_DEV_LOGGING } from '../constants';

// 글로벌 로깅 제어 (프로세스 수준)
const globalLoggingState = {
  hasLogged: false
};

// 글로벌 인스턴스 캐싱 (프로세스 수준)
let globalDbInstance: any = null;

// 싱글톤 패턴으로 데이터베이스 연결 관리
class DatabaseConnection {
  private static instance: DatabaseConnection;
  private client: any;
  private db: any;
  private isInitialized = false;
  private isLogged = false;

  private constructor() {
    // 이미 글로벌 인스턴스가 있으면 재사용
    if (globalDbInstance) {
      this.client = globalDbInstance.client;
      this.db = globalDbInstance.db;
      this.isInitialized = true;
      this.isLogged = true;
      return;
    }
    
    this.initialize();
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  private initialize() {
    if (this.isInitialized) return;

    try {
      // 데이터베이스 연결 설정
      let connectionString = process.env.FRONTEND_DATABASE_URL || process.env.FRONTEND_POSTGRES_URL;

      // postgresql:// 프로토콜을 postgres://로 변경
      if (connectionString && connectionString.startsWith('postgresql://')) {
        connectionString = connectionString.replace('postgresql://', 'postgres://');
        // 로그는 한 번만 출력 (개발 환경에서만, ENABLE_DEV_LOGGING이 true일 때만)
        this.log('프로토콜을 postgres://로 변경했습니다.');
      }

      // 환경 변수 로깅 (개발 환경에서만, 로깅이 활성화되어 있을 때만)
      this.log('환경 변수 확인:', () => {
        console.log('- FRONTEND_DATABASE_URL 존재:', typeof process.env.FRONTEND_DATABASE_URL !== 'undefined');
        console.log('- FRONTEND_POSTGRES_URL 존재:', typeof process.env.FRONTEND_POSTGRES_URL !== 'undefined');
        
        if (connectionString) {
          const maskedUrl = connectionString.replace(/(:\/\/|:)([^:@]+)(:|@)([^:@]+)(@)/, '$1[USER]$3[PASSWORD]$5');
          console.log('사용할 DB 연결 문자열:', maskedUrl);
        } else {
          console.log('⚠️ 경고: 유효한 연결 문자열을 찾을 수 없습니다.');
        }
      });

              // FRONTEND_DATABASE_URL이 없으면 Supabase 연결 문자열 생성 시도
      if (!connectionString) {
        console.log('📝 FRONTEND_DATABASE_URL이 없습니다. Supabase 환경변수로 연결 시도 중...');
        
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (supabaseUrl && supabaseKey) {
          // Supabase URL에서 프로젝트 ID 추출
          const projectId = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
          
          // Supabase PostgreSQL 연결 문자열 생성 (올바른 형식)
          // Service Role Key는 비밀번호가 아니므로 실제 DB 비밀번호가 필요합니다
          console.log('⚠️ Supabase Service Role Key로는 PostgreSQL 직접 연결이 불가능합니다.');
          console.log('💡 FRONTEND_DATABASE_URL을 직접 설정하거나 백엔드 API를 사용하세요.');
        } else {
          console.log('⚠️ Supabase 환경변수가 없습니다. 더미 연결을 사용합니다.');
          console.log('🔧 실제 데이터베이스 작업은 백엔드 API를 통해 처리됩니다.');
        }
        
        // 더미 연결 생성 (실제로는 사용되지 않음)
        this.client = postgres('postgresql://dummy:dummy@localhost:5432/dummy', {
          ssl: false,
          connect_timeout: 1,
          idle_timeout: 1,
          max: 1,
        });
        this.db = drizzle(this.client);
        this.isInitialized = true;
        return;
      }

      this.client = postgres(connectionString, {
        ssl: { rejectUnauthorized: false },
        connect_timeout: 30,
        idle_timeout: 30,
        max: 10,
      });

      this.db = drizzle(this.client);
      this.isInitialized = true;
      
      // 글로벌 캐시에 저장
      globalDbInstance = {
        client: this.client,
        db: this.db
      };

      // 연결 테스트 (DATABASE_URL이 있을 때만, 더미 연결이 아닐 때만)
      if (connectionString && 
          !connectionString.includes('dummy') && 
          process.env.NODE_ENV === 'development' && 
          ENABLE_DEV_LOGGING !== false) {
        this.testConnection();
      }
    } catch (error) {
      console.error('데이터베이스 연결 초기화 오류:', error);
      // 기본 클라이언트 생성
      this.client = postgres('');
      this.db = drizzle(this.client);
    }
  }

  private async testConnection() {
    try {
      const result = await this.client`SELECT 1 as connection_test`;
      this.log('✅ 데이터베이스 연결 성공:', () => console.log(result));
    } catch (error) {
      console.error('❌ 데이터베이스 연결 실패:', error);
    }
  }
  
  // 프로세스 수준에서 로그 중복 방지
  private log(message: string, callback?: () => void) {
    // 로깅이 비활성화되어 있거나 이미 로깅했으면 무시
    if (process.env.NODE_ENV !== 'development' || 
        ENABLE_DEV_LOGGING === false || 
        this.isLogged || 
        globalLoggingState.hasLogged) {
      return;
    }
    
    console.log(message);
    if (callback) callback();
    
    this.isLogged = true;
    globalLoggingState.hasLogged = true;
  }

  public getDb() {
    return this.db;
  }
}

// 데이터베이스 인스턴스 가져오기
const db = DatabaseConnection.getInstance().getDb();

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error('Failed to get user from database', error);
    // 오류 세부 정보 로깅
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    return [];
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ email, password: hashedPassword });
  } catch (error) {
    console.error('Failed to create user in database', error);
    throw error;
  }
}

export const createGuestUser = async () => {
  // UUID 형식의 게스트 사용자 ID 생성
  const guestId = generateUUID();
  return [{ 
    id: guestId, 
    email: `guest-${guestId}@guest.user`
  }];
};

export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    const now = new Date();
    return await db.insert(chat).values({
      id,
      createdAt: now,
      userId,
      title,
    });
  } catch (error) {
    console.error('Failed to save chat in database');
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (error) {
    console.error('Failed to delete chat by id from database');
    throw error;
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id),
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Array<Chat> = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new Error(`Chat with id ${startingAfter} not found`);
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new Error(`Chat with id ${endingBefore} not found`);
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (error) {
    console.error('Failed to get chats by user from database');
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error('Failed to get chat by id from database', error);
    throw error;
  }
}

export async function saveMessages({
  messages,
}: {
  messages: Array<DBMessage>;
}) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    console.error('Failed to save messages in database', error);
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    console.error('Failed to get messages by chat id from database', error);
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    console.error('Failed to upvote message in database', error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error('Failed to get votes by chat id from database', error);
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (error) {
    console.error('Failed to save document in database');
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (error) {
    console.error(
      'Failed to delete documents by id after timestamp from database',
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error('Failed to save suggestions in database');
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    console.error(
      'Failed to get suggestions by document version from database',
    );
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error('Failed to get message by id from database');
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((message: { id: string }) => message.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
  } catch (error) {
    console.error(
      'Failed to delete messages by id after timestamp from database',
    );
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error('Failed to update chat visibility in database');
    throw error;
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: { id: string; differenceInHours: number }) {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(
      now.getTime() - differenceInHours * 60 * 60 * 1000,
    );

    const chats = await db
      .select({ id: chat.id })
      .from(chat)
      .where(eq(chat.userId, id));

    const chatIds = chats.map((c: { id: string }) => c.id);

    return db
      .select({ count: count() })
      .from(message)
      .where(
        and(
          inArray(message.chatId, chatIds),
          gte(message.createdAt, twentyFourHoursAgo),
        ),
      );
  } catch (error) {
    console.error('Failed to get message count by user id from database');
    throw error;
  }
}
