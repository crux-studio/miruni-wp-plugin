import { FC } from 'react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorMessage: FC<ErrorMessageProps> = ({ message, onRetry, className = '' }) => {
  return (
    <div
      className={`bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded shadow-sm ${className}`}
      role="alert"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          <div>
            <p className="text-red-700 font-medium">{message}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                type="button"
                className="mt-2 text-sm text-red-700 underline hover:text-red-800"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
