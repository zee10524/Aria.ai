import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Github, ArrowRight, Eye, EyeOff, Moon, Sun } from "lucide-react";
import API from "../lib/api";

export default function Login() {
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/auth/login", form);
      localStorage.setItem("token", res.data.token);
      navigate("/dashboard");
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "No user exists, please sign up"
      );
    }
  };

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-[#0A0A0A] transition-colors duration-200 p-4 relative">

        {/* Background Glow */}
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#DFFF5E]/20 rounded-full blur-[120px] opacity-50 pointer-events-none" />

        {/* Header */}
        <header className="absolute top-0 w-full max-w-7xl mx-auto p-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
              <span className="text-white dark:text-black font-mono font-bold text-xl">
                &gt;_
              </span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              ARIA<span className="text-[#DFFF5E]">.ai</span>
            </span>
          </div>
        </header>

        {/* Login Card */}
        <div className="relative z-10 w-full max-w-md bg-white dark:bg-[#151515] border border-gray-200 dark:border-[#333] rounded-2xl shadow-xl p-8 md:p-10">

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome back
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Enter your credentials to access your workspace.
            </p>
          </div>

          {/* GitHub Button (UI Only) */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 bg-[#24292F] hover:opacity-90 text-white py-3 px-4 rounded-lg font-medium transition-all hover:scale-[1.02] active:scale-[0.98] mb-6 shadow-lg"
          >
            <Github size={20} />
            Sign in with GitHub
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px bg-gray-200 dark:bg-[#333] flex-1" />
            <span className="text-xs text-gray-400 uppercase tracking-wider">
              or email
            </span>
            <div className="h-px bg-gray-200 dark:bg-[#333] flex-1" />
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleLogin}>
            {/* Email */}
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
                className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-[#333] rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#DFFF5E] focus:border-transparent transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-[#333] rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#DFFF5E] focus:border-transparent transition-all"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full bg-[#DFFF5E] cursor-pointer text-black font-semibold py-3 px-4 rounded-lg shadow-lg hover:bg-[#d0f04e] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Sign In
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Don't have an account?{" "}
              <span
                onClick={() => navigate("/signup")}
                className="text-gray-900 dark:text-white font-medium cursor-pointer hover:underline"
              >
                Create a workspace
              </span>
            </p>
          </div>
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="fixed bottom-6 right-6 p-3 bg-white dark:bg-[#151515] border border-gray-200 dark:border-[#333] rounded-full shadow-lg text-gray-500 dark:text-gray-400 hover:text-[#DFFF5E]"
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </div>
  );
}