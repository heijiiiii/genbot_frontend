import { type NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8001';
const API_TIMEOUT = Number.parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000', 10);

// AbortController를 사용한 타임아웃 함수
const fetchWithTimeout = async (url: string, options: RequestInit, timeout: number) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history, debug_mode = false } = body;

    // 타임아웃이 적용된 백엔드 요청
    const response = await fetchWithTimeout(
      `${BACKEND_URL}/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          history,
          debug_mode,
        }),
      },
      API_TIMEOUT
    );

    if (!response.ok) {
      throw new Error(`백엔드 서버 오류: ${response.status}`);
    }

    const data = await response.json();
    
    // API 응답 디버깅
    if (debug_mode) {
      console.log('🔍 API 라우트 - 백엔드 응답:', data);
      console.log('🖼️ API 라우트 - 이미지 배열:', data.images);
    }
    
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('채팅 API 오류:', error);
    
    // 타임아웃 에러 구분
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: '요청 시간이 초과되었습니다. 다시 시도해주세요.' },
        { status: 408 }
      );
    }
    
    return NextResponse.json(
      { error: '채팅 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // 백엔드 서버 상태 확인 (타임아웃 적용)
    const response = await fetchWithTimeout(
      `${BACKEND_URL}/health`,
      {},
      5000 // 상태 확인은 더 짧은 타임아웃 적용
    );
    
    const data = await response.json();
    
    return NextResponse.json({
      status: 'ok',
      backend: data,
      backend_url: BACKEND_URL,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error && error.name === 'AbortError'
      ? '백엔드 서버 응답 시간 초과'
      : '백엔드 서버에 연결할 수 없습니다.';
      
    return NextResponse.json(
      { 
        status: 'error', 
        message: errorMessage,
        backend_url: BACKEND_URL,
      },
      { status: 503 }
    );
  }
} 