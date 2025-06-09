'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import HUDQuestionCards from '@/components/hud-question-cards';

// 메시지 타입 정의
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  images?: Array<{
    url: string;
    page: string | number;
    relevance_score: number;
  }>;
}

export default function PageContent({
  id,
  selectedChatModel
}: {
  id: string;
  selectedChatModel: string;
}) {
  const [inputValue, setInputValue] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // HUD 질문 선택 처리 함수
  const handleQuestionSelect = (question: string) => {
    setInputValue(question);
    setSelectedQuestion(question);
    // 스크롤을 챗봇 섹션으로 이동
    const chatSection = document.querySelector('[data-chatbot-section]');
    if (chatSection) {
      chatSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 메시지 전송 함수
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    
    try {
      const userMessage = inputValue.trim();
      console.log('전송할 메시지:', userMessage);
      
      setInputValue(''); // 입력창 비우기
      setIsLoading(true); // 로딩 시작
      
      // 사용자 메시지를 즉시 UI에 추가
      const newUserMessage: Message = {
        id: Date.now().toString(),
        role: 'user' as const,
        content: userMessage,
        createdAt: new Date()
      };
      
      // useChat append 대신 직접 메시지 추가
      setMessages(prev => [...prev, newUserMessage]);
      
      // 백엔드 API 호출
      const response = await fetch('https://genesisbot.onrender.com/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          history: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          debug_mode: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('백엔드 에러 응답:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const jsonData = await response.json();
      console.log('백엔드 응답 데이터:', jsonData);
      
      // AI 응답을 UI에 추가 (이미지 포함)
      let cleanAnswer = jsonData.answer || '응답을 받을 수 없습니다.';
      
      // 이미지 관련 텍스트 완전히 제거 (여러 패턴 대응)
      cleanAnswer = cleanAnswer
        .replace(/📷 관련 이미지:[\s\S]*$/, '') // 📷로 시작하는 부분부터 끝까지
        .replace(/\[이미지 \d+\][\s\S]*?(?=\n\n|$)/g, '') // [이미지 N] 패턴
        .replace(/관련 이미지[\s\S]*?(?=\n\n|$)/g, '') // "관련 이미지"로 시작하는 부분
        .replace(/\n\s*\n\s*$/g, '') // 끝부분의 여러 줄바꿈
        .trim();
      
      console.log('정리된 답변:', cleanAnswer);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: cleanAnswer,
        createdAt: new Date(),
        images: jsonData.images || []
      };
      
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('메시지 전송 오류:', error);
      
      // 오류 메시지를 UI에 추가
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        createdAt: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false); // 로딩 종료
    }
  };

  // Enter 키 처리
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-900">
      {/* 헤더 */}
      <header className="py-4 px-6 md:px-10 flex justify-between items-center">
        <div className="flex items-center">
          <div className="flex items-center">
            <Image 
              src="/genlogo1.png" 
              alt="Genesis Logo" 
              width={60} 
              height={60} 
              className="mr-2" 
            />
            <h1 className="text-xl font-semibold paperlogy-heading">Genesis G80</h1>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 flex flex-col">
        {/* 히어로 섹션 */}
        <section className="w-full bg-white relative">
          {/* 회색 띠 - INTELLIGENT ASSISTANT부터 통계 섹션까지 정확히 덮기 */}
          <div className="absolute left-0 right-0 bg-gray-100 z-0" style={{ top: '180px', height: '220px' }} />
          
          <div className="max-w-[1200px] mx-auto relative z-10 flex flex-col md:flex-row items-center">
            <div className="w-full md:w-1/2 flex justify-center">
              <Image 
                src="/gen80.png" 
                alt="Genesis G80" 
                width={600} 
                height={400} 
                className="object-contain" 
                priority
              />
            </div>
            <div className="w-full md:w-1/2 p-4 flex flex-col justify-center items-start min-h-[400px]">
              {/* QUIET. POWERFUL. ELEGANT. + Genesis G80 - 상하 중앙 정렬 */}
              <div className="flex flex-col justify-center items-start flex-1">
                <p className="text-[14px] md:text-[16px] text-[#9D8A68] uppercase tracking-[0.4em] font-semibold paperlogy-caption mb-0 md:mb-2">
                  QUIET.&nbsp;&nbsp;&nbsp;POWERFUL.&nbsp;&nbsp;&nbsp;ELEGANT.
                </p>
                
                <h1 className="text-[36px] md:text-[54px] font-bold text-gray-900 mb-3 md:mb-4" 
                    style={{ 
                      fontFamily: 'var(--font-paperlogy)', 
                      letterSpacing: '0.02em', 
                      lineHeight: '1.0'
                    }}>
                  Genesis G80
                </h1>
              </div>
              
              {/* INTELLIGENT ASSISTANT - 상단 정렬 */}
              <div className="flex flex-col justify-start items-start flex-1">
                <h2 className="text-lg md:text-2xl font-semibold paperlogy-subheading text-gray-800" 
                    style={{ letterSpacing: '-0.01em', lineHeight: '1.35' }}>
                  INTELLIGENT ASSISTANT
                </h2>
                
                {/* 설명 텍스트 */}
                <p className="text-[12px] md:text-[14px] text-justify max-w-md" 
                   style={{ 
                     fontFamily: 'var(--font-paperlogy)', 
                     letterSpacing: '0.02em', 
                     lineHeight: '1.6'
                   }}>
                  This perfect driving companion with advanced intelligence and seamless connectivity. Ask any question about your vehicle's features, maintenance, or driving experience.
                </p>
              </div>

              {/* 통계 섹션 */}
              <div className="w-full max-w-md" style={{ marginTop: '-50px' }}>
                <div className="flex justify-between items-center">
                  {/* 24/7 */}
                  <div className="text-center">
                    <div className="text-[22px] md:text-[26px] font-semibold text-[#9D8A68]"
                         style={{ fontFamily: 'var(--font-paperlogy)', letterSpacing: '-0.025em', lineHeight: '1.0' }}>
                      24/7
                    </div>
                    <div className="text-[11px] md:text-[13px] uppercase tracking-[0.15em] text-gray-600 font-medium paperlogy-caption">
                      ASSISTANCE
                    </div>
                  </div>

                  {/* 구분선 */}
                  <div className="h-10 w-px bg-gray-400 mx-4"></div>

                  {/* 100% */}
                  <div className="text-center">
                    <div className="text-[22px] md:text-[26px] font-semibold text-[#9D8A68]"
                         style={{ fontFamily: 'var(--font-paperlogy)', letterSpacing: '-0.025em', lineHeight: '1.0' }}>
                      100%
                    </div>
                    <div className="text-[11px] md:text-[13px] uppercase tracking-[0.15em] text-gray-600 font-medium paperlogy-caption">
                      ACCURACY
                    </div>
                  </div>

                  {/* 구분선 */}
                  <div className="h-10 w-px bg-gray-400 mx-4"></div>

                  {/* 500+ */}
                  <div className="text-center">
                    <div className="text-[22px] md:text-[26px] font-semibold text-[#9D8A68]"
                         style={{ fontFamily: 'var(--font-paperlogy)', letterSpacing: '-0.025em', lineHeight: '1.0' }}>
                      500+
                    </div>
                    <div className="text-[11px] md:text-[13px] uppercase tracking-[0.15em] text-gray-600 font-medium paperlogy-caption">
                      TOPICS
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 카드섹션 */}
          <div className="relative z-20 pt-3 pb-3">
            <HUDQuestionCards onSelect={handleQuestionSelect} />
          </div>
        </section>

        {/* 챗봇 섹션 */}
        <section className="bg-gray-50 pt-6 pb-12 px-6" data-chatbot-section>
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-[32px] shadow-lg overflow-hidden">
              {/* 상단 네이비 바 */}
              <div className="h-2 bg-[#111827] w-full" />
              
              {/* 헤더 */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#9D8A68] rounded-full" />
                  <span className="font-semibold text-lg text-gray-900" style={{ fontFamily: 'var(--font-paperlogy)' }}>GENESIS MANUAL ASSISTANT</span>
                </div>
              </div>
              
              {/* 채팅 메시지 영역 */}
              <div className="p-6 min-h-[200px] max-h-[400px] overflow-y-auto">
                {/* 초기 환영 메시지 (메시지가 없을 때만 표시) */}
                {messages.length === 0 && (
                  <div className="flex items-start gap-4 mb-6">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium" style={{ fontFamily: 'var(--font-paperlogy)' }}>G</span>
                    </div>
                    <div className="flex-1 max-w-[80%]">
                      <div className="p-4 rounded-2xl shadow-sm border bg-white text-gray-800 border-gray-100">
                        <p className="text-[15px]" style={{ fontFamily: 'var(--font-paperlogy)' }}>
                          Hello! I'm your GENESIS Manual Assistant. How can I help you with your vehicle today?
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 메시지들 */}
                {messages.map((message) => (
                  <div key={message.id} className={`flex items-start gap-4 mb-6 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium" style={{ fontFamily: 'var(--font-paperlogy)' }}>G</span>
                      </div>
                    )}
                    {message.role === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 bg-[#9D8A68] rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium" style={{ fontFamily: 'var(--font-paperlogy)' }}>U</span>
                      </div>
                    )}
                    <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                      <div className={`p-4 rounded-2xl shadow-sm border ${
                        message.role === 'user' 
                          ? 'bg-[#9D8A68] text-white border-[#9D8A68] ml-auto' 
                          : 'bg-white text-gray-800 border-gray-100 mr-auto'
                      }`} style={{ 
                        maxWidth: 'fit-content', 
                        marginLeft: message.role === 'user' ? 'auto' : 'unset',
                        marginRight: message.role === 'user' ? 'unset' : 'auto'
                      }}>
                        {/* 메시지 텍스트 - 포맷팅 개선 */}
                        <div className="text-[15px] leading-relaxed" style={{ fontFamily: 'var(--font-paperlogy)' }}>
                          {message.content.split('\n').map((line, index, array) => {
                            // 번호 목록 감지 (1. 2. 3. 등)
                            if (line.trim().match(/^\d+\.\s+\*\*/)) {
                              const parts = line.split('**');
                              return (
                                <div key={index} className="mb-3">
                                  <div className="font-semibold text-gray-900 mb-1">
                                    {parts[0]}
                                    <span className="font-bold">{parts[1]}</span>
                                    {parts[2] && parts[2].replace(/\*\*/g, '')}
                                  </div>
                                  {parts[3] && (
                                    <div className="ml-4 text-gray-700 text-sm leading-relaxed">
                                      {parts[3].replace(/\*\*/g, '')}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            // 일반 텍스트 - 볼드 처리
                            else if (line.includes('**')) {
                              const parts = line.split('**');
                              return (
                                <p key={index} className={index < array.length - 1 ? 'mb-2' : ''}>
                                  {parts.map((part, partIndex) => 
                                    partIndex % 2 === 1 ? (
                                      <span key={partIndex} className="font-semibold text-gray-900">{part}</span>
                                    ) : (
                                      <span key={partIndex}>{part}</span>
                                    )
                                  )}
                                </p>
                              );
                            }
                            // 빈 줄
                            else if (line.trim() === '') {
                              return <br key={index} />;
                            }
                            // 일반 줄
                            else {
                              return (
                                <p key={index} className={index < array.length - 1 ? 'mb-2' : ''}>
                                  {line}
                                </p>
                              );
                            }
                          })}
                        </div>
                        
                        {/* 이미지 표시 */}
                        {message.role === 'assistant' && (message as any).images && (message as any).images.length > 0 && (
                          <div className="mt-4 border-t border-gray-200 pt-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              📷 관련 이미지
                              <span className="text-xs text-gray-500">({(message as any).images.length}개)</span>
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {(message as any).images.map((image: any, index: number) => (
                                <div key={index} className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                                  <div className="aspect-video bg-gray-100 flex items-center justify-center">
                                    {image.url ? (
                                      <img 
                                        src={image.url} 
                                        alt={`관련 이미지 ${index + 1}`}
                                        className="w-full h-full object-contain"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                          (e.target as HTMLImageElement).nextElementSibling!.classList.remove('hidden');
                                        }}
                                      />
                                    ) : null}
                                    <div className="hidden text-gray-500 text-sm text-center p-4">
                                      이미지를 불러올 수 없습니다
                                    </div>
                                  </div>
                                  <div className="p-3">
                                    <p className="text-xs text-gray-600">
                                      <span className="font-medium">페이지 {image.page || 'N/A'}</span>
                                      {image.relevance_score && (
                                        <span className="ml-2">
                                          관련성: {(image.relevance_score * 100).toFixed(0)}%
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* 로딩 상태 */}
                {isLoading && (
                  <div className="flex items-start gap-4 mb-6">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium" style={{ fontFamily: 'var(--font-paperlogy)' }}>G</span>
                    </div>
                    <div className="flex-1 max-w-[80%]">
                      <div className="p-4 rounded-2xl shadow-sm border bg-white text-gray-800 border-gray-100">
                        <p className="text-[15px]" style={{ fontFamily: 'var(--font-paperlogy)' }}>응답을 생성하고 있습니다...</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 입력 영역 */}
              <div className="p-6 border-t border-gray-100">
                <form onSubmit={handleSendMessage} className="relative">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="디지털 키 등록 방법이 궁금해요."
                    className="w-full pl-6 pr-14 py-4 bg-white border-2 border-[#9D8A68] rounded-full focus:outline-none focus:ring-2 focus:ring-[#9D8A68]/50"
                    style={{ fontFamily: 'var(--font-paperlogy)' }}
                  />
                  <Button 
                    type="submit" 
                    disabled={isLoading || !inputValue.trim()} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#9D8A68] hover:bg-[#9D8A68]/80 text-white w-10 h-10 rounded-full flex items-center justify-center"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
} 