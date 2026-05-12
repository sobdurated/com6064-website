"use client";

interface LoadingBarProps {
  loading: boolean;
  className?: string;
}

export function LoadingBar({ loading, className = "" }: LoadingBarProps) {
  if (!loading) return null;

  return (
    <div className={`w-full overflow-hidden rounded border-2 mb-4 ${className}`} style={{ height: '6px' }}>
      <div
        className="h-full rounded"
        style={{
          width: '40%',
          background: 'linear-gradient(90deg, #2f9e44, #40c057, #2f9e44)',
          animation: 'loadingSlide 1s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes loadingSlide {
          0% { margin-left: 0%; }
          50% { margin-left: 60%; }
          100% { margin-left: 0%; }
        }
      `}</style>
    </div>
  );
}
