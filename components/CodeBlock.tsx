'use client';

import { useState } from 'react';

interface CodeBlockProps {
  code: string;
  title?: string;
}

export function CodeBlock({ code, title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 text-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{title ?? 'Code'}</span>
        <button
          onClick={copy}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto bg-gray-950 text-gray-100 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
