"use client"

import * as RadixPortal from '@radix-ui/react-portal';
import { cn } from "@/lib/utils";

const Portal = ({ children, className }) => (
  <RadixPortal.Root>
    <div className={cn("z-[99999]", className)}>
      {children}
    </div>
  </RadixPortal.Root>
);

export { Portal };
