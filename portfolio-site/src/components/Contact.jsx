import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Mail, Instagram } from "lucide-react";

const ease    = [0.22, 1, 0.36, 1];
const fadeUp  = {
  hidden:  { opacity: 0, y: 32 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.65, ease } }),
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

export default function Contact() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px 0px" });

  return (
    <section id="contact" className="bg-white py-28 md:py-36 px-6 border-t border-gray-200">
      <div className="max-w-7xl mx-auto">
        <motion.div ref={ref} initial="hidden" animate={inView ? "visible" : "hidden"} variants={stagger} className="text-center">
          <motion.p variants={fadeUp} className="text-amber-400 text-[10px] tracking-[0.35em] uppercase mb-6">
            Get In Touch
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1}
            className="text-gray-900 font-black uppercase leading-none mb-8"
            style={{ fontSize: "clamp(2.8rem,8vw,6rem)", letterSpacing: "-0.025em" }}>
            Work Together
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="text-white/35 text-sm leading-relaxed max-w-md mx-auto mb-14">
            Available for production, co-writes, sync placements, and sessions. Based in New York City.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="mailto:contact@stephenthethird.com"
              className="flex items-center gap-2.5 px-9 py-4 bg-amber-400 text-black text-[11px] font-black tracking-[0.18em] uppercase hover:bg-amber-300 transition-colors">
              <Mail size={13} /> Email
            </a>
            <a href="https://instagram.com/stephenthethird" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-9 py-4 border border-gray-200 text-gray-900 text-[11px] tracking-[0.18em] uppercase hover:border-white/40 transition-colors">
              <Instagram size={13} /> Instagram
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
