'use client';

import { useRef, useState } from 'react';
import { importPdf, getApiErrorMessage } from '@/lib/api';

export interface PdfImportResult {
  html: string;
  suggestedTitle?: string;
}

interface PdfImportButtonProps {
  disabled?: boolean;
  hasExistingContent: boolean;
  onImported: (result: PdfImportResult) => void;
  onError: (message: string) => void;
}

export function PdfImportButton({
  disabled,
  hasExistingContent,
  onImported,
  onError,
}: PdfImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      file.type !== 'application/pdf' &&
      !file.name.toLowerCase().endsWith('.pdf')
    ) {
      onError('Файл должен быть в формате PDF');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (hasExistingContent) {
      const confirmed = confirm(
        'Текущее содержание будет заменено текстом из PDF. Продолжить?',
      );
      if (!confirmed) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    setImporting(true);
    try {
      const result = await importPdf(file);
      onImported({
        html: result.html,
        suggestedTitle: result.suggestedTitle,
      });
    } catch (err: unknown) {
      onError(getApiErrorMessage(err, 'Ошибка импорта PDF'));
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        className="btn btn-secondary"
        onClick={handleClick}
        disabled={disabled || importing}
        style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
        title="Импортировать текст из PDF"
      >
        {importing ? 'Импорт...' : 'PDF'}
      </button>
    </>
  );
}
