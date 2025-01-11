import { cn } from "@/lib/utils";
import { motion, useAnimation } from "framer-motion";
import React, { useEffect } from "react";

const transition = {
  duration: 10,
  ease: "linear",
  repeat: Infinity,
  repeatType: "mirror",
};

export const EntangledStrings = ({
  pathLengths,
  paths,
  filterPaths,
  colors,
  title,
  description,
  className,
}: {
  pathLengths: number[];
  paths: string[];
  filterPaths: string[];
  colors: string[];
  title?: string;
  description?: string;
  className?: string;
}) => {
  const controls = useAnimation();

  useEffect(() => {
    controls.start((i) => ({
      pathLength: pathLengths[i],
      transition: transition,
    }));
  }, [pathLengths]);

  return (
    <div className={cn("relative -top-14 h-full", className)}>
      <svg
        width="1440"
        height="890"
        viewBox="0 0 1440 890"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute w-full -top-96"
      >
        {paths.map((path, index) => (
          <motion.path
            key={index}
            d={path}
            stroke={colors[index]}
            strokeWidth="2"
            fill="none"
            initial={{
              pathLength: 0,
            }}
            animate={{
              pathLength: [0, 1, 0],
            }}
            transition={transition}
          />
        ))}
        {filterPaths.map((filterPath, index) => (
          <path
            key={index}
            d={filterPath}
            stroke={colors[index]}
            strokeWidth="2"
            fill="none"
            pathLength={1}
            filter="url(#blurMe)"
          />
        ))}
        <defs>
          <filter id="blurMe">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
          </filter>
        </defs>
      </svg>
    </div>
  );
};
