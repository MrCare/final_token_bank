/*
 * @Author: Mr.Car
 * @Date: 2025-07-27 16:30:00
 */
import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  gradient: string;
}

export function PageContainer({ children, gradient }: PageContainerProps) {
  return (
    <div className={`relative overflow-hidden ${gradient} border border-gray-200/60 rounded-3xl p-8 shadow-xl shadow-gray-100/50`}>
      <div className="absolute inset-0 bg-gradient-to-r from-current/5 to-transparent" />
      <div className="relative space-y-8">
        {children}
      </div>
    </div>
  );
}

interface PageHeaderProps {
  icon: string;
  title: string;
  subtitle: string;
  iconColor: string;
  titleColor: string;
}

export function PageHeader({ icon, title, subtitle, iconColor, titleColor }: PageHeaderProps) {
  return (
    <div className="text-center space-y-3">
      <div className={`inline-flex items-center justify-center w-16 h-16 ${iconColor} rounded-2xl shadow-lg mb-4`}>
        <span className="text-2xl">{icon}</span>
      </div>
      <h2 className={`text-3xl font-bold ${titleColor} bg-clip-text text-transparent`}>
        {title}
      </h2>
      <p className="text-gray-600 text-lg">{subtitle}</p>
    </div>
  );
}

interface InfoCardProps {
  icon: string;
  title: string;
  subtitle: string;
  iconColor: string;
  children: ReactNode;
}

export function InfoCard({ icon, title, subtitle, iconColor, children }: InfoCardProps) {
  return (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-lg">
      <div className="flex items-center space-x-3 mb-6">
        <div className={`w-10 h-10 ${iconColor} rounded-xl flex items-center justify-center`}>
          <span className="text-white text-lg">{icon}</span>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <p className="text-gray-600 text-sm">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

interface StatsCardProps {
  icon: string;
  title: string;
  subtitle: string;
  value: string;
  unit: string;
  bgColor: string;
  iconColor: string;
}

export function StatsCard({ icon, title, subtitle, value, unit, bgColor, iconColor }: StatsCardProps) {
  return (
    <div className={`relative overflow-hidden ${bgColor} rounded-2xl p-6 text-white shadow-lg`}>
      <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
      <div className="relative">
        <div className="flex items-center space-x-3 mb-4">
          <div className={`w-10 h-10 ${iconColor} rounded-xl flex items-center justify-center`}>
            <span className="text-xl">{icon}</span>
          </div>
          <div>
            <h3 className="font-semibold text-white text-lg">{title}</h3>
            <p className="text-white/80 text-sm">{subtitle}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-white mb-1">
            {value}
          </div>
          <div className="text-white/90 text-lg font-medium">
            {unit}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ActionButtonProps {
  icon: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant: 'primary' | 'secondary' | 'danger';
}

export function ActionButton({ icon, label, onClick, disabled = false, loading = false, variant }: ActionButtonProps) {
  const variants = {
    primary: 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700',
    secondary: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        w-full ${variants[variant]} disabled:from-gray-400 disabled:to-gray-500 
        text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 
        shadow-lg hover:shadow-xl disabled:cursor-not-allowed transform hover:scale-[1.02] 
        disabled:hover:scale-100
      `}
    >
      {loading ? (
        <div className="flex items-center justify-center space-x-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>处理中...</span>
        </div>
      ) : (
        <div className="flex items-center justify-center space-x-2">
          <span>{icon}</span>
          <span>{label}</span>
        </div>
      )}
    </button>
  );
}

interface StatusCardProps {
  icon: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
}

export function StatusCard({ icon, title, message, type }: StatusCardProps) {
  const types = {
    success: 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200/60 text-emerald-800',
    warning: 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/60 text-amber-800',
    info: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200/60 text-blue-800',
    error: 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200/60 text-red-800'
  };

  const iconColors = {
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    info: 'text-blue-600',
    error: 'text-red-600'
  };

  return (
    <div className={`${types[type]} border rounded-2xl p-6 shadow-lg`}>
      <div className="flex items-center justify-center space-x-3">
        <span className={`${iconColors[type]} text-2xl`}>{icon}</span>
        <div className="text-center">
          <h4 className="font-semibold text-lg">{title}</h4>
          <p className="text-sm">{message}</p>
        </div>
        <span className={`${iconColors[type]} text-2xl`}>{icon}</span>
      </div>
    </div>
  );
}

interface FeatureListProps {
  title: string;
  subtitle: string;
  icon: string;
  bgColor: string;
  iconBgColor: string;
  features: Array<{
    icon: string;
    text: string;
  }>;
}

export function FeatureList({ title, subtitle, icon, bgColor, iconBgColor, features }: FeatureListProps) {
  return (
    <div className={`${bgColor} border border-gray-200/60 rounded-2xl p-6 shadow-lg`}>
      <div className="flex items-center space-x-3 mb-4">
        <div className={`w-8 h-8 ${iconBgColor} rounded-lg flex items-center justify-center`}>
          <span className="text-white text-sm">{icon}</span>
        </div>
        <h3 className="font-semibold text-lg">{title}</h3>
      </div>
      <p className="text-sm mb-4 opacity-80">{subtitle}</p>
      <div className="grid grid-cols-2 gap-4">
        {features.map((feature, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-emerald-500 text-lg">{feature.icon}</span>
              <span className="text-sm font-medium">{feature.text}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface DataRowProps {
  label: string;
  value: string;
  isLast?: boolean;
}

export function DataRow({ label, value, isLast = false }: DataRowProps) {
  return (
    <div className={`flex justify-between items-center py-3 ${!isLast ? 'border-b border-gray-100' : ''}`}>
      <span className="text-gray-600 font-medium">{label}</span>
      <span className="font-mono text-gray-900 bg-gray-50 px-3 py-1 rounded-lg">
        {value}
      </span>
    </div>
  );
}

interface InputFieldProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  disabled?: boolean;
  type?: string;
}

export function InputField({ placeholder, value, onChange, suffix, disabled = false, type = "text" }: InputFieldProps) {
  return (
    <div className="relative">
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {suffix && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
          {suffix}
        </div>
      )}
    </div>
  );
}
