'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import type { Session } from 'next-auth';
import { Send } from 'lucide-react';
import { useChat } from 'ai/react';

import { Chat } from '@/components/chat';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import HUDQuestionCards from '@/components/hud-question-cards';

// 로그인/회원가입 모달 컴포넌트
const AuthModal = ({ 
  isOpen, 
  onOpenChange, 
  isLogin = true 
}: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void; 
  isLogin?: boolean;
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isLogin ? '로그인' : '회원가입'}</DialogTitle>
          <DialogDescription>
            {isLogin 
              ? 'Genesis G80 서비스를 이용하기 위해 로그인해주세요.' 
              : '새로운 계정을 만들어 Genesis G80 서비스를 이용해보세요.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">이메일</Label>
            <Input id="email" type="email" placeholder="example@email.com" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input id="password" type="password" />
          </div>
          {!isLogin && (
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">비밀번호 확인</Label>
              <Input id="confirmPassword" type="password" />
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          {isLogin && (
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/register">계정이 없으신가요?</Link>
            </Button>
          )}
          <Button type="button" className="w-full sm:w-auto bg-[#9D8A68] hover:bg-[#9D8A68]/80">
            {isLogin ? '로그인' : '회원가입'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// 클라이언트 컴포넌트
export default function PageContent({
  id,
  selectedChatModel,
  isLoggedIn,
  session
}: {
  id: string;
  selectedChatModel: string;
  isLoggedIn: boolean;
  session: Session | null;
}) {
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState('');

  // useChat 훅을 사용해서 실제 채팅 기능 구현
  const {
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    append
  } = useChat({
    id,
    body: { id, modelId: selectedChatModel },
    onResponse: (response) => {
      console.log('채팅 응답 받음:', response);
    },
    onError: (error) => {
      console.error('채팅 오류:', error);
    }
  });

  // inputValue와 useChat의 input을 동기화
  useEffect(() => {
    setInput(inputValue);
  }, [inputValue, setInput]);

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
    
    const userMessage = inputValue.trim();
    setInputValue(''); // 입력창 비우기
    
    // useChat의 append 함수를 사용해서 메시지 전송
    await append({
      role: 'user',
      content: userMessage
    });
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
      {/* 로그인/회원가입 모달 */}
      <AuthModal isOpen={loginModalOpen} onOpenChange={setLoginModalOpen} isLogin={true} />
      <AuthModal isOpen={registerModalOpen} onOpenChange={setRegisterModalOpen} isLogin={false} />

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
        <div className="flex items-center space-x-2">
          <Button 
            className="bg-transparent hover:bg-gray-100 text-gray-800 border border-gray-300 px-4 py-2 text-sm"
            onClick={() => setLoginModalOpen(true)}
          >
            로그인
          </Button>
          <Button 
            className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 text-sm"
            onClick={() => setRegisterModalOpen(true)}
          >
            회원가입
          </Button>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="flex-1">
        {/* 챗봇 섹션 */}
        <section className="bg-gray-50 pt-6 pb-12 px-6" data-chatbot-section>
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
              {/* 상단 회색 바 */}
              <div className="h-2 bg-gray-800 w-full" />
              
              {/* 헤더 */}
              <div className="p-4 border-b border-gray-100 flex items-center">
                <div className="w-2 h-2 mr-3 bg-[#9D8A68] rounded-full" />
                <span className="font-semibold paperlogy-heading text-gray-800">GENESIS MANUAL ASSISTANT</span>
              </div>
              
              {/* 채팅 메시지 영역 */}
              <div className="p-4 bg-gray-50 min-h-[400px] max-h-[600px] overflow-y-auto">
                {messages.map((message) => (
                  <div key={message.id} className={`flex items-start space-x-4 mb-4 ${message.role === 'user' ? 'justify-end' : ''}`}>
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">G</span>
                      </div>
                    )}
                    <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                      <div className={`p-4 rounded-lg shadow-sm border ${
                        message.role === 'user' 
                          ? 'bg-gray-900 text-white border-gray-800 ml-auto' 
                          : 'bg-white text-gray-800 border-gray-100'
                      }`}>
                        <p className="text-[15px] paperlogy-body">{message.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* 입력 영역 */}
              <div className="p-4 border-t border-gray-100">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="메시지를 입력하세요..."
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9D8A68]"
                  />
                  <Button 
                    type="submit" 
                    disabled={isLoading || !inputValue.trim()}
                    className="bg-[#9D8A68] hover:bg-[#9D8A68]/80 text-white p-2 rounded-lg"
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