import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    Moyasar?: { init: (config: Record<string, unknown>) => void };
  }
}

function loadMoyasarScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Moyasar) {
      resolve();
      return;
    }
    if (!document.querySelector('link[data-moyasar-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.moyasar.com/moyasar.css';
      link.dataset.moyasarCss = 'true';
      document.head.appendChild(link);
    }
    const existing = document.querySelector('script[data-moyasar]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      if (window.Moyasar) resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.moyasar.com/moyasar.js';
    script.dataset.moyasar = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load payment gateway'));
    document.body.appendChild(script);
  });
}

interface MoyasarCheckoutProps {
  publishableKey: string;
  amountSar: number;
  description: string;
  callbackUrl: string;
  currency?: string;
}

export default function MoyasarCheckout({
  publishableKey,
  amountSar,
  description,
  callbackUrl,
  currency = 'SAR',
}: MoyasarCheckoutProps) {
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!publishableKey || amountSar <= 0 || !formRef.current) return;
    let cancelled = false;
    loadMoyasarScript()
      .then(() => {
        if (cancelled || !formRef.current) return;
        formRef.current.innerHTML = '';
        window.Moyasar?.init({
          element: formRef.current,
          amount: Math.round(amountSar * 100),
          currency,
          description,
          publishable_api_key: publishableKey,
          callback_url: callbackUrl,
          methods: ['creditcard', 'mada', 'applepay'],
        });
      })
      .catch(() => {
        // parent handles errors via UI if needed
      });
    return () => {
      cancelled = true;
    };
  }, [publishableKey, amountSar, description, callbackUrl, currency]);

  return <div ref={formRef} className="moyasar-form-wrap" />;
}
