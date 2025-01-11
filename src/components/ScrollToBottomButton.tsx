import React from 'react';
import { useAtBottom, useScrollToBottom } from 'react-scroll-to-bottom';
import { MoveDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';

// Define the scrollVariants using cva
const scrollVariants = cva(
  'cursor-pointer absolute z-[100] rounded-full p-3 border transition-all duration-300 ease-in-out',
  {
    variants: {
      variant: {
        chat: 'md:bottom-[50px] bottom-[20px] left-1/2',
        image: 'bottom-[50px] md:bottom-[50px] left-[45%]',
      },
      theme: {
        light: 'border-gray-200 bg-gray-50 text-gray-900 hover:bg-gray-100 hover:border-gray-300 dark:hover:bg-gray-700 dark:hover:border-gray-500',
        dark: 'border-white/10 bg-white/10 text-gray-900 hover:bg-white/20 hover:border-white/20 dark:hover:bg-gray-800 dark:hover:border-gray-600',
      },
    },
    defaultVariants: {
      variant: 'chat',
      theme: 'light',
    },
  }
);

export interface ScrollProps
  extends React.ButtonHTMLAttributes,
    VariantProps {
  asChild?: boolean;
}

const ScrollToBottomButton = React.memo(
  React.forwardRef(({ className, variant, theme, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    const scrollToBottom = useScrollToBottom();
    const [atBottom] = useAtBottom();

    return (
      <motion.div
        className={cn(scrollVariants({ variant, theme }), className)}
        ref={ref}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={scrollToBottom}
        {...props}
      >
        <motion.div
          className="flex items-center justify-center"
          animate={{ y: ['0%', '-20%', '0%'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <MoveDown className="w-5 h-5 text-black" />
        </motion.div>
      </motion.div>
    );
  })
);

ScrollToBottomButton.displayName = 'ScrollToBottomButton';

export { ScrollToBottomButton };

