import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { motionTokens, rise } from "./motion";

export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: 0.08 }}
      variants={rise}
      transition={{ duration: motionTokens.entrance, ease: motionTokens.ease, delay }}
    >
      {children}
    </motion.div>
  );
}
