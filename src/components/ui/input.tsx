import * as React from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react'; 

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ComponentType; 
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon: Icon, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [isEmpty, setIsEmpty] = React.useState(false);

    return (
      <div className="relative w-full py-4 flex items-center">
        <input
          type={type === 'password' && showPassword ? 'text' : type}
          className={cn(
            "border-input text-slate-800 border ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 placeholder:italic placeholder:text-slate-400 h-10 w-full py-2 pl-9 pr-3 bg-gray-100 focus:bg-white rounded-md shadow-sm focus:outline-none sm:text-sm",
            Icon ? 'pr-10' : '',
            className
          )}
          ref={ref}
          {...props}
        />
        {type === 'password' && (
          <div className="absolute right-3 top-[28px] h-5 w-5 text-gray-400 cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
