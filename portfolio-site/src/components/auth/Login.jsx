import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogIn, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === "superadmin" ? "/admin/design" : "/admin/review");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <span className="text-gray-900 font-black text-2xl tracking-[0.2em] uppercase">
            S<span className="text-amber-400">3</span>
          </span>
          <p className="text-gray-500 text-xs tracking-[0.2em] uppercase mt-2">Studio OS</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-gray-400 text-[10px] tracking-[0.2em] uppercase mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-gray-100 border border-gray-200 text-gray-900 text-sm px-4 py-3 focus:outline-none focus:border-amber-400/40 transition-colors"
              placeholder="you@s3.com"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-gray-400 text-[10px] tracking-[0.2em] uppercase mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-gray-100 border border-gray-200 text-gray-900 text-sm px-4 py-3 pr-11 focus:outline-none focus:border-amber-400/40 transition-colors"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition-colors">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400/80 text-xs tracking-wide">{error}</p>
          )}

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-amber-400 text-black text-[11px] font-black tracking-[0.18em] uppercase hover:bg-amber-300 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2">
            <LogIn size={13} />
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-gray-300 text-[10px] text-center mt-8">
          Stephenthethird Studio OS — private access only
        </p>
      </motion.div>
    </div>
  );
}
