import type { CSSProperties } from 'react';

type CurrencyIconProps = {
  size?: number;
  className?: string;
  style?: CSSProperties;
};

export function CurrencyIcon({ size = 16, className, style }: CurrencyIconProps) {
  return (
    <img
      src="/Riyal/Saudi_Riyal_Symbol-2.svg"
      alt="SAR"
      className={className}
      style={{
        height: size,
        width: 'auto',
        display: 'inline-block',
        verticalAlign: 'middle',
        marginRight: 4,
        opacity: 0.9,
        ...style,
      }}
    />
  );
}
