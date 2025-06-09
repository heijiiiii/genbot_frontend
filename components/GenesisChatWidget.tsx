"use client";

import { useState, useRef, useEffect } from "react";
import { Send, ZoomIn, X } from "lucide-react";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  images?: Array<{
    url: string;
    page: string;
    relevance_score: number;
  }>;
}

interface ParsedContent {
  text: string;
  images: string[];
}

// 메시지 내용에서 이미지 URL을 추출하고 텍스트와 분리하는 함수
function parseMessageContent(content: string): ParsedContent {
  // Supabase 이미지 URL 패턴 매칭
  const imageUrlPattern = /https:\/\/[^\s]+\.supabase\.co\/storage\/v1\/object\/public\/images\/[^\s]+\.(jpg|jpeg|png|gif)(\?[^\s]*)?/gi;
  const images = content.match(imageUrlPattern) || [];
  
  // 이미지 URL을 제거한 텍스트
  let text = content.replace(imageUrlPattern, '').trim();
  
  // 연속된 공백이나 줄바꿈 정리
  text = text.replace(/\n\s*\n/g, '\n').replace(/\s+/g, ' ').trim();
  
  return { text, images };
}

// 어시스턴트 메시지 포맷팅 함수 (간단한 버전)
function formatAssistantMessage(text: string): string {
  // 단락 구분을 위해 연속된 줄바꿈을 더블 줄바꿈으로 변환
  let formatted = text
    .replace(/\n\s*\n/g, '\n\n')  // 연속된 줄바꿈 정리
    .replace(/(\d+\.\s)/g, '\n$1')  // 번호 리스트 앞에 줄바꿈 추가
    .replace(/(^\*\s|^-\s)/gm, '\n$1')   // 불릿 포인트 앞에 줄바꿈 추가
    .trim();

  // "이 설정에 대해 더 자세히 알고 싶으시면..." 앞에 줄바꿈 추가
  formatted = formatted.replace(/(\n)?(이 설정에 대해 더 자세히 알고 싶으시면)/g, '\n\n$2');
  
  return formatted;
}

// 이미지 컴포넌트
function MessageImage({ src, alt, onClick }: { src: string; alt: string; onClick: () => void }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div 
      className="mt-3 relative group cursor-pointer" 
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      {isLoading && (
        <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600" />
        </div>
      )}
      {hasError ? (
        <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
          <div className="text-center text-gray-500">
            <div className="text-sm">이미지를 불러올 수 없습니다</div>
            <div className="text-xs mt-1 break-all px-2">{src}</div>
          </div>
        </div>
      ) : (
        <div className="relative">
          <img
            src={src}
            alt={alt}
            className={`w-full max-w-md rounded-lg shadow-md transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
            <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" size={24} />
          </div>
        </div>
      )}
    </div>
  );
}

// 이미지 모달 컴포넌트
function ImageModal({ src, alt, isOpen, onClose }: { src: string; alt: string; isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleImageKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" 
      onClick={handleBackdropClick}
      onKeyDown={handleImageKeyDown}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative max-w-4xl max-h-full">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
        >
          <X size={24} />
        </button>
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-full object-contain rounded-lg"
          onClick={handleImageClick}
          onKeyDown={handleImageKeyDown}
          role="img"
          tabIndex={0}
        />
      </div>
    </div>
  );
}

export default function GenesisChatWidget({ 
  initialMessage = "",
  onQuestionSelect 
}: { 
  initialMessage?: string;
  onQuestionSelect?: (question: string) => void;
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your GENESIS Manual Assistant. How can I help you with your vehicle today?',
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [modalImage, setModalImage] = useState<{ src: string; alt: string } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [windowWidth, setWindowWidth] = useState(0);

  // 창 크기 변경 감지 및 스크롤 조정
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    // 초기값 설정
    handleResize();
    
    // 이벤트 리스너 등록
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 메시지 변경 시 스크롤 조정
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  // 초기 메시지 처리
  useEffect(() => {
    if (initialMessage?.trim()) {
      setInput(initialMessage);
      // 자동으로 전송하려면 아래 주석 해제
      // handleSendMessage(initialMessage);
    }
  }, [initialMessage]);

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      console.log('🚀 API 요청 시작:', messageText);
      
      const requestBody = {
        message: messageText,
        history: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        debug_mode: false
      };
      
      console.log('📤 요청 본문:', requestBody);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📡 응답 상태:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 응답 오류:', errorText);
        throw new Error(`네트워크 오류: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // 백엔드 응답 디버깅
      console.log('🔍 백엔드 응답 데이터:', data);
      console.log('🖼️ 이미지 배열:', data.images);
      console.log('📝 컨텍스트:', data.context);
      console.log('🔧 디버그 정보:', data.debug_info);
      
      // 백엔드에서 받은 이미지 정보를 메시지에 포함
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer || '죄송합니다. 응답을 생성할 수 없습니다.',
        timestamp: new Date(),
        images: data.images || [] // 백엔드에서 받은 이미지 배열 추가
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('채팅 오류:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      handleSendMessage(input);
      setInput("");
    }
  };

  const openImageModal = (src: string, alt: string) => {
    setModalImage({ src, alt });
  };

  const closeImageModal = () => {
    setModalImage(null);
  };

  return (
    <>
      <div className="w-full h-full flex justify-center items-start py-8 bg-gray-100">
        <div className="w-full mx-auto px-4" style={{ maxWidth: "1024px" }}>
          <div className="rounded-2xl overflow-hidden shadow-lg relative">
            {/* 배경 레이어 - 시각적 계층감을 위한 회색 배경 */}
            <div className="absolute inset-0 bg-gray-200 transform translate-x-2 translate-y-2 rounded-2xl" />
            
            {/* 메인 채팅 컨테이너 */}
            <div className="w-full flex flex-col bg-white border border-gray-200 rounded-2xl relative z-10">
              {/* 상단 포인트 라인 */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-gray-300 via-gray-600 to-gray-300" />
              
              {/* 헤더 - 지네시스 브랜드 스타일 강화 */}
              <div className="bg-gradient-to-b from-[#515151] to-[#434343] px-8 py-5 flex-shrink-0 flex items-center justify-between relative">
                <div className="flex items-center">
                  <span className="font-semibold text-lg tracking-wide text-white"><span className="mr-2">&middot;</span>GENESIS MANUAL ASSISTANT</span>
                </div>
              </div>

              {/* 메시지 리스트 */}
              <div 
                ref={listRef} 
                className="flex-1 overflow-y-auto px-8 py-6 bg-white space-y-4"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#ddd #fff', height: 'calc(100vh - 210px)' }}
              >
                {messages.map((message) => {
                  const parsedContent = parseMessageContent(message.content);
                  
                  return (
                    <div key={message.id} className={`flex items-start w-full ${message.role === 'user' ? 'justify-end' : ''}`}>
                      {message.role === 'assistant' && (
                        <div className="flex-shrink-0 w-8 h-8 bg-[#111] rounded-full flex items-center justify-center mr-3">
                          <span className="text-white text-xs">G</span>
                        </div>
                      )}
                      <div className={`p-4 rounded-2xl shadow-sm max-w-[80%] ${
                        message.role === 'user' 
                          ? 'bg-[#9D8A68] text-white ml-auto' 
                          : 'bg-[#f9f9f9] text-gray-800'
                      }`}>
                        {/* 텍스트 내용 */}
                        {parsedContent.text && (
                          <div className={`whitespace-pre-wrap ${
                            message.role === 'assistant' 
                              ? 'leading-relaxed text-[15px] space-y-2' 
                              : ''
                          }`} style={{
                            wordBreak: 'keep-all',
                            overflowWrap: 'break-word'
                          }}>
                            {message.role === 'assistant' 
                              ? formatAssistantMessage(parsedContent.text)
                              : parsedContent.text
                            }
                          </div>
                        )}
                        
                        {/* 이미지들 - 백엔드에서 받은 이미지 우선 표시 */}
                        {message.images && message.images.length > 0 ? (
                          message.images.map((image, index) => (
                            <MessageImage
                              key={`backend-${image.url}-${index}`}
                              src={image.url}
                              alt={`Genesis manual image - Page ${image.page}`}
                              onClick={() => openImageModal(image.url, `Genesis manual image - Page ${image.page}`)}
                            />
                          ))
                        ) : (
                          // 백엔드 이미지가 없으면 텍스트에서 추출한 이미지 사용
                          parsedContent.images.map((imageUrl) => (
                            <MessageImage
                              key={`parsed-${imageUrl}`}
                              src={imageUrl}
                              alt="Genesis manual image"
                              onClick={() => openImageModal(imageUrl, "Genesis manual image")}
                            />
                          ))
                        )}
                      </div>
                      {message.role === 'user' && (
                        <div className="flex-shrink-0 w-8 h-8 bg-[#9D8A68] rounded-full flex items-center justify-center ml-3">
                          <span className="text-white text-xs">U</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {isLoading && (
                  <div className="flex items-start w-full">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#111] rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-xs">G</span>
                    </div>
                    <div className="bg-[#f9f9f9] p-4 rounded-2xl text-gray-800 shadow-sm">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 입력창 - 지네시스 스타일 */}
              <div className="border-t border-gray-100 p-4 px-8 bg-white flex-shrink-0">
                <form onSubmit={handleSend} className="flex items-center">
                  <div className="flex items-center bg-white border-2 border-[#9D8A68] rounded-full px-4 py-3 w-full">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask a question about your Genesis..."
                      className="flex-1 outline-none text-gray-700 bg-transparent"
                    />
                    <button 
                      type="submit" 
                      className="bg-[#111] hover:bg-[#333] text-white rounded-full p-2 w-8 h-8 flex items-center justify-center ml-2 transition-colors"
                      aria-label="전송"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <title>전송 아이콘</title>
                        <path d="M22 2L11 13" />
                        <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                      </svg>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 이미지 모달 */}
      {modalImage && (
        <ImageModal
          src={modalImage.src}
          alt={modalImage.alt}
          isOpen={true}
          onClose={closeImageModal}
        />
      )}
    </>
  );
} 