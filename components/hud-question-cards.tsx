'use client';

import { useState } from 'react';

const questions = [
  "스마트 크루즈 기능 작동방법은?",
  "디지털 키 등록 방법이 궁금해요.",
  "차량 점검 알림이 떴어요."
];

export default function HUDQuestionCards({ 
  onSelect
}: { 
  onSelect: (q: string) => void
}) {
  // 모든 질문 사용
  const displayQuestions = questions;
  
  const handleSelect = (question: string) => {
    onSelect(question);
  };

  return (
    <div className="max-w-4xl mx-auto px-6">
      <div className="flex flex-col md:flex-row justify-center gap-3 md:gap-4 py-4">
        {displayQuestions.map((question, index) => (
          <button
            key={`question-${index}`}
            className="text-white rounded-lg shadow-md px-6 py-4 cursor-pointer transition-all duration-200 flex-1 text-center min-h-[80px] flex items-center justify-center"
            style={{ 
              backgroundColor: '#989897'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#878686'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#989897'}
            onClick={() => handleSelect(question)}
            type="button"
          >
            <p className="text-sm md:text-base font-medium leading-relaxed">
              {question}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
} 