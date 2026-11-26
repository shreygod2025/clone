import React from 'react';

export const LoadingSpinner = ({
  text = 'Loading...',
  fullScreen = false,
  size = 'md', // 'sm' | 'md' | 'lg'
  className = '',
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-10 w-10 border-2',
    lg: 'h-14 w-14 border-4',
  }[size] || 'h-10 w-10 border-2';

  if (fullScreen) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 ${className}`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full border-b-[#D63031] border-slate-200 mx-auto ${sizeClasses}`}></div>
          {text && <p className="mt-3 text-slate-500 text-sm font-medium">{text}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      <div className={`animate-spin rounded-full border-b-[#D63031] border-slate-200 mx-auto ${sizeClasses}`}></div>
      {text && <p className="mt-3 text-slate-500 text-sm font-medium">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
