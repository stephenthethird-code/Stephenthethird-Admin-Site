import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? "bg-black/80 backdrop-blur-2xl border-b border-gray-200" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2.5">
          <span className="text-gray-900 font-black text-sm tracking-[0.25em] uppercase">
            S<span className="text-amber-400">3</span>
          </span>
          <span className="hidden sm:block text-gray-300 text-[11px] tracking-[0.12em] uppercase">
            Stephenthethird
          </span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {[["#catalog","Catalog"],["#credits","Credits"],["#contact","Contact"]].map(([href, label]) => (
            <a key={href} href={href}
              className="text-gray-400 hover:text-gray-900 text-[11px] tracking-[0.2em] uppercase transition-colors duration-200">
              {label}
            </a>
          ))}
        </div>

        <a href="#contact"
          className="text-[11px] tracking-[0.18em] uppercase px-5 py-2 border border-amber-400/30 text-amber-400 hover:bg-amber-400 hover:text-black transition-all duration-200 font-medium">
          Inquiries
        </a>
      </div>
    </motion.nav>
  );
}
