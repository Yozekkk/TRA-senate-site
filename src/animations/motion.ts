export const motionTokens = {
  fast: 0.16,
  standard: 0.26,
  entrance: 0.56,
  ease: [0.22, 1, 0.36, 1] as const,
};

export const rise = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

export const stagger = {
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.12 } },
};
