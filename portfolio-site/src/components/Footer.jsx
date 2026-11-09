import { Instagram, Disc3 } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-200 py-10 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="text-gray-300 text-[10px] tracking-[0.22em] uppercase">
          © {new Date().getFullYear()} Stephenthethird · New York City
        </span>
        <div className="flex items-center gap-5">
          <a href="https://open.spotify.com/playlist/1XgTbRLuT8tYNiwVs6cT2K"
            target="_blank" rel="noopener noreferrer"
            className="text-gray-300 hover:text-amber-400 transition-colors">
            <Disc3 size={15} />
          </a>
          <a href="https://instagram.com/stephenthethird"
            target="_blank" rel="noopener noreferrer"
            className="text-gray-300 hover:text-amber-400 transition-colors">
            <Instagram size={15} />
          </a>
        </div>
      </div>
    </footer>
  );
}
