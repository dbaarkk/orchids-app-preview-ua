'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Image as ImageIcon, ArrowLeft } from 'lucide-react';

export default function OpenFilePage() {
  const [fileInfo, setFileInfo] = useState<{ name: string; type: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    // In a real TWA, the file would be passed via the launchQueue API
    if ('launchQueue' in window) {
      (window as any).launchQueue.setConsumer((launchParams: any) => {
        if (launchParams.files && launchParams.files.length > 0) {
          const fileHandle = launchParams.files[0];
          setFileInfo({
            name: fileHandle.name,
            type: fileHandle.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'
          });
        }
      });
    }
  }, []);

  return (
    <div className="mobile-container bg-gray-50 min-h-screen flex flex-col p-6">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 mb-8 hover:text-primary transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Back</span>
      </button>

      <div className="bg-white rounded-3xl p-8 shadow-sm flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6">
          {fileInfo?.type === 'application/pdf' ? <FileText size={40} /> : <ImageIcon size={40} />}
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">File Received</h1>
        <p className="text-gray-500 mb-8">
          {fileInfo 
            ? `You opened: ${fileInfo.name}`
            : 'No file was detected. This page handles files shared from your device.'}
        </p>

        <button
          onClick={() => router.push('/home')}
          className="w-full bg-primary text-white py-4 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
