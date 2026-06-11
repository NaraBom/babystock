'use client';

interface Props {
  emoji: string;
  size?: number; // px, default 20
  className?: string;
}

export default function EmojiDisplay({ emoji, size = 20, className = '' }: Props) {
  const isImage = emoji.startsWith('/') || emoji.startsWith('http');
  if (isImage) {
    return (
      <img
        src={emoji}
        alt=""
        width={size}
        height={size}
        className={`object-contain flex-shrink-0 ${className}`}
      />
    );
  }
  return <span className={`leading-none flex-shrink-0 ${className}`}>{emoji}</span>;
}
