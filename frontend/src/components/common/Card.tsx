import React from "react";

interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = "",
}) => {
  return (
    <div
      className={`bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm shadow-sm ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
          <div>
            {title && <h3 className="text-base font-semibold text-slate-100">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};

