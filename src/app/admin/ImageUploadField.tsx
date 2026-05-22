'use client';

import { useRef, useState } from 'react';

/**
 * 관리자 페이지용 이미지 업로드 필드.
 *
 * - 파일 선택 또는 드래그앤드롭 → /api/admin/upload-image 로 POST
 * - 성공 시 Vercel Blob URL 을 부모 컴포넌트로 전달 (onUploaded)
 * - 기존 image_url 도 그대로 텍스트 입력으로 유지 (Drive URL 호환)
 * - 미리보기 표시
 */

type Props = {
  /** 현재 image_url 값 */
  value: string | null;
  /** 변경 콜백 (텍스트 입력 또는 업로드 완료) */
  onChange: (next: string | null) => void;
  /** 업로드 시 파일명 prefix 로 쓸 자재 ID — 빈 값이면 "image" 사용 */
  materialId?: string;
  /** 관리자 토큰 (sessionStorage) */
  token: string | null;
  /** 401 발생 시 로그아웃 처리 */
  onUnauthorized?: () => void;
};

export function ImageUploadField({ value, onChange, materialId, token, onUnauthorized }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const uploadFile = async (file: File) => {
    if (!token) {
      setErr('인증 토큰 없음 — 다시 로그인하세요.');
      return;
    }
    setUploading(true);
    setErr(null);

    const fd = new FormData();
    fd.append('file', file);
    if (materialId) fd.append('material_id', materialId);

    try {
      const res = await fetch('/api/admin/upload-image', {
        method: 'POST',
        headers: { 'x-admin-token': token },
        body: fd,
      });
      if (res.status === 401) {
        onUnauthorized?.();
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErr(data.message || data.detail || data.error || `업로드 실패 (${res.status})`);
        return;
      }
      onChange(data.url);
    } catch (e) {
      setErr('네트워크 오류: ' + String(e));
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) uploadFile(f);
    // input value 리셋 — 같은 파일 재선택 가능하도록
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) uploadFile(f);
  };

  return (
    <div className="space-y-2">
      {/* 미리보기 (있을 때만) */}
      {value && (
        <div className="flex items-start gap-3">
          {/* 일반 img 태그 (정규화 안 해도 됨 — 입력값 그대로) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="자재 이미지 미리보기"
            className="w-24 h-24 object-cover rounded border border-zinc-200 bg-zinc-50"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="flex-1 text-[10px] text-zinc-500 break-all leading-relaxed">
            <div className="font-mono">{value}</div>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="mt-1 text-red-600 hover:underline font-semibold"
            >
              제거
            </button>
          </div>
        </div>
      )}

      {/* 텍스트 입력 (URL 직접 입력 — 폴백) */}
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder="이미지 URL (또는 아래 버튼으로 업로드)"
        className="input text-xs"
      />

      {/* 업로드 영역 */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-zinc-300 rounded-lg p-3 text-center bg-zinc-50/30 hover:bg-blue-50/30 transition"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
          id="image-upload-input"
        />
        <label
          htmlFor="image-upload-input"
          className={`inline-block px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition ${
            uploading
              ? 'bg-zinc-200 text-zinc-500 cursor-wait'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {uploading ? '⏳ 업로드 중...' : '📤 파일 선택 또는 드래그앤드롭'}
        </label>
        <div className="mt-1.5 text-[10px] text-zinc-500">
          JPG / PNG / WebP · 최대 4 MB
        </div>
      </div>

      {err && (
        <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5">
          {err}
        </div>
      )}
    </div>
  );
}
