import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export default function FlowyDrag({ children }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const smoothX = useSpring(x, {
    stiffness: 100,
    damping: 15,
    mass: 0.8,
  });

  const smoothY = useSpring(y, {
    stiffness: 100,
    damping: 15,
    mass: 0.8,
  });

  const rotate = useTransform(x, [-200, 200], [-12, 12]);

  return (
    <motion.div
      drag
      dragMomentum={false}
      style={{ x, y }}
      className="relative w-40 h-40 cursor-grab"
    >
      <motion.div
        style={{
          x: useTransform([smoothX, x], ([smooth, raw]) => smooth - raw),
          y: useTransform([smoothY, y], ([smooth, raw]) => smooth - raw),
          rotate,
        }}
        className="w-full h-full rounded-3xl bg-purple-500 shadow-xl"
      />
      {children}
    </motion.div>
  );
}
