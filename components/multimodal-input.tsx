'use client';

import type { Attachment, UIMessage } from 'ai';
import cx from 'classnames';
import type React from 'react';
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
  memo,
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';

import { ArrowUpIcon, StopIcon } from './icons';
import { PreviewAttachment } from './preview-attachment';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { SuggestedActions } from './suggested-actions';
import equal from 'fast-deep-equal';
import type { UseChatHelpers } from '@ai-sdk/react';
import { cn } from '@/lib/utils';

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  append,
  handleSubmit,
  className,
}: {
  chatId: string;
  input: UseChatHelpers['input'];
  setInput: UseChatHelpers['setInput'];
  status: UseChatHelpers['status'];
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers['setMessages'];
  append: UseChatHelpers['append'];
  handleSubmit: UseChatHelpers['handleSubmit'];
  className?: string;
}) {
  console.log('🔄 MultimodalInput 컴포넌트 로드됨', { chatId, status });
  
  // textareaRef 상태 확인
  useEffect(() => {
    if (textareaRef.current) {
      console.log('✅ textareaRef 연결됨:', textareaRef.current);
      console.log('📍 DOM 요소 정보:', {
        tagName: textareaRef.current.tagName,
        className: textareaRef.current.className,
        disabled: textareaRef.current.disabled,
        value: textareaRef.current.value
      });
    } else {
      console.log('❌ textareaRef가 null입니다');
    }
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  const resetHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '98px';
    }
  };

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    'input',
    '',
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || '';
      setInput(finalValue);
      adjustHeight();
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    console.log('📝 입력 변경됨:', event.target.value);
    setInput(event.target.value);
    adjustHeight();
  };

  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);

  // input 상태 변화 감지
  useEffect(() => {
    console.log('📊 input 상태 변경됨:', input);
  }, [input]);

  // disabled 상태 감지
  const isDisabled = status === 'streaming' || status === 'submitted' || uploadQueue.length > 0;
  useEffect(() => {
    console.log('🚫 입력창 비활성화 상태:', { status, uploadQueue: uploadQueue.length, isDisabled });
  }, [status, uploadQueue.length, isDisabled]);

  // 네이티브 DOM 이벤트 리스너 추가 (React 이벤트와 별도)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    console.log('🔧 네이티브 이벤트 리스너 등록');
    
    const handleNativeInput = (e: Event) => {
      console.log('🎯 네이티브 input 이벤트:', (e.target as HTMLTextAreaElement).value);
    };
    
    const handleNativeKeyDown = (e: KeyboardEvent) => {
      console.log('🎯 네이티브 keydown 이벤트:', e.key);
    };
    
    const handleNativeClick = (e: MouseEvent) => {
      console.log('🎯 네이티브 click 이벤트');
    };

    textarea.addEventListener('input', handleNativeInput);
    textarea.addEventListener('keydown', handleNativeKeyDown);
    textarea.addEventListener('click', handleNativeClick);
    
    return () => {
      console.log('🧹 네이티브 이벤트 리스너 제거');
      textarea.removeEventListener('input', handleNativeInput);
      textarea.removeEventListener('keydown', handleNativeKeyDown);
      textarea.removeEventListener('click', handleNativeClick);
    };
  }, []);

  const submitForm = useCallback(() => {
    console.log('🚀 submitForm 호출됨 - 입력값:', input);
    
    // 입력값에 불필요한 공백과 줄바꿈 제거 (양쪽 끝 및 중복 공백/줄바꿈)
    const trimmedInput = input.trim().replace(/\s+/g, ' ');
    
    console.log('🔄 정리된 입력값:', trimmedInput);
    
    // 빈 입력값 검증
    if (!trimmedInput) {
      console.log('❌ 빈 입력값으로 인해 전송 취소');
      return;
    }

    console.log('📤 메시지 전송 시작 - handleSubmit 호출');
    
    // 정리된 입력값으로 메시지 전송
    handleSubmit(undefined, {
      experimental_attachments: attachments,
      data: {
        content: trimmedInput // 정리된 입력값 사용
      }
    });

    console.log('🧹 입력 폼 정리 시작');
    setAttachments([]);
    setLocalStorageInput('');
    resetHeight();

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
    
    console.log('✅ submitForm 완료');
  }, [
    attachments,
    handleSubmit,
    setAttachments,
    setLocalStorageInput,
    width,
    chatId,
    input // input 의존성 추가
  ]);

  // 전역 접근을 위한 함수 추가
  useEffect(() => {
    // @ts-ignore
    window.submitGalaxyForm = submitForm;
    
    // 샘플 질문 선택 이벤트 리스너 추가
    const handleQuestionSelected = (e: any) => {
      if (e.detail && e.detail.question) {
        const questionText = e.detail.question;
        // 입력 설정
        setInput(questionText);
        
        // 약간의 지연 후 폼 제출
        setTimeout(() => {
          submitForm();
        }, 100);
      }
    };
    
    window.addEventListener('galaxy:question-selected', handleQuestionSelected);
    
    return () => {
      // @ts-ignore
      delete window.submitGalaxyForm;
      window.removeEventListener('galaxy:question-selected', handleQuestionSelected);
    };
  }, [submitForm, setInput]);

  return (
    <div className="relative w-full flex flex-col gap-4">
      <form
        onSubmit={(event) => {
          console.log('📋 폼 제출 이벤트 발생');
          event.preventDefault();
          submitForm();
        }}
        className="relative"
      >
        <div className="flex items-center relative">
          <Textarea
            ref={textareaRef}
            data-testid="multimodal-input"
            tabIndex={0}
            onFocus={() => console.log('🔍 입력창에 포커스됨')}
            onClick={() => console.log('🖱️ 입력창 클릭됨')}
            onInput={(event) => console.log('📝 onInput 이벤트:', event.currentTarget.value)}
            onKeyDown={(event) => {
              console.log('⌨️ 키 눌림:', event.key);
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                console.log('⌨️ Enter 키 감지 - 검색 실행');
                event.preventDefault();
                submitForm();
              }
            }}
            placeholder="메시지 입력..."
            value={input}
            onChange={(event) => {
              console.log('🔄 onChange 이벤트 발생:', event.target.value);
              handleInput(event);
            }}
            className="min-h-[58px] rounded-2xl pr-12 border-galaxy-light/70 focus:border-galaxy-blue focus:ring-1 focus:ring-galaxy-blue/50 shadow-galaxy transition-all duration-200 resize-none bg-white placeholder:text-gray-400"
            disabled={isDisabled}
          />
        </div>

        <div className="absolute flex gap-1.5 items-center right-2 bottom-2.5">
          {status === 'streaming' ? (
            <PureStopButton stop={stop} setMessages={setMessages} />
          ) : (
            <PureSendButton
              submitForm={submitForm}
              input={input}
              uploadQueue={uploadQueue}
            />
          )}
        </div>
      </form>

      {input === '' &&
        status !== 'streaming' &&
        messages.length > 0 &&
        messages[messages.length - 1].role === 'assistant' && (
          <SuggestedActions chatId={chatId} append={append} />
        )}
    </div>
  );
}

export const MultimodalInput = memo(PureMultimodalInput, (prevProps, nextProps) => {
  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.input !== nextProps.input) return false;
  if (!equal(prevProps.attachments, nextProps.attachments)) return false;
  if (!equal(prevProps.messages, nextProps.messages)) return false;
  return true;
});

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: UseChatHelpers['setMessages'];
}) {
  return (
    <Button
      type="button"
      size="icon"
      className="size-8 bg-galaxy-red/85 hover:bg-galaxy-red text-white rounded-full shadow-sm hover:shadow-md transition-all duration-200"
      onClick={() => {
        stop();
        setMessages((messages) => {
          const lastMessage = messages[messages.length - 1];
          if (lastMessage.role === 'assistant') {
            return messages.slice(0, -1);
          }
          return messages;
        });
      }}
      data-testid="stop-button"
    >
      <StopIcon />
      <span className="sr-only">Stop generating</span>
    </Button>
  );
}

const StopButton = memo(PureStopButton);

function PureSendButton({
  submitForm,
  input,
  uploadQueue,
}: {
  submitForm: () => void;
  input: string;
  uploadQueue: Array<string>;
}) {
  const isEmpty = input.trim().length === 0;
  const isUploading = uploadQueue.length > 0;

  const handleClick = () => {
    console.log('🖱️ 전송 버튼 클릭됨');
    console.log('입력값 상태:', { input, isEmpty, isUploading });
    if (!isEmpty && !isUploading) {
      console.log('🚀 전송 버튼에서 submitForm 호출');
      submitForm();
    } else {
      console.log('❌ 전송 불가 - 빈 입력값 또는 업로드 중');
    }
  };

  return (
    <Button
      type="submit"
      size="icon"
      data-testid="send-button"
      onClick={handleClick}
      className={cn(
        'size-8 transition-all duration-300 rounded-full shadow-sm hover:shadow-md',
        isEmpty || isUploading
          ? 'bg-galaxy-blue/40 text-white cursor-not-allowed'
          : 'bg-gradient-to-r from-galaxy-blue to-galaxy-navy text-white hover:from-galaxy-blue-light hover:to-galaxy-blue transform hover:scale-105'
      )}
      disabled={isEmpty || isUploading}
    >
      <ArrowUpIcon />
      <span className="sr-only">Send message</span>
    </Button>
  );
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.uploadQueue.length !== nextProps.uploadQueue.length)
    return false;
  if (prevProps.input !== nextProps.input) return false;
  return true;
});
