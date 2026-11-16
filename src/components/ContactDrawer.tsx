import { useState, useEffect } from 'react';
import { X, Send, Check, Mail, Copy, ArrowUpRight, Sparkles } from 'lucide-react';

interface ContactDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactDrawer({ isOpen, onClose }: ContactDrawerProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [scope, setScope] = useState('Product & UI Design');
  const [timeline, setTimeline] = useState('Within 1-2 Months');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      // Create mailto link as direct action
      const subject = encodeURIComponent(`Project Inquiry: ${scope} (${name})`);
      const body = encodeURIComponent(`Hello Moamen,\n\nName: ${name}\nEmail: ${email}\nScope: ${scope}\nTimeline: ${timeline}\n\nProject Details:\n${message}\n\nSent from Moamen.design portfolio`);
      window.location.href = `mailto:Supportfinity@gmail.com?subject=${subject}&body=${body}`;
    }, 1200);
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('Supportfinity@gmail.com');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        data-lenis-prevent
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-[#E7E5DF] text-[#111111] rounded-3xl border border-black/15 shadow-2xl p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-black/10 hover:bg-black hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs font-mono-code text-neutral-500 mb-1">
            <span>// INQUIRY DESK</span>
            <span>·</span>
            <span>DIRECT ACCESS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#111111] uppercase font-sans">
            Start a Conversation
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1">
            Let's discuss design systems, spatial interfaces, or digital products.
          </p>
        </div>

        {/* Quick Email Banner */}
        <div className="mb-6 p-3 rounded-2xl bg-black/[0.04] border border-black/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-neutral-600" />
            <span className="font-mono-code font-semibold text-neutral-900">Supportfinity@gmail.com</span>
          </div>
          <button
            onClick={handleCopyEmail}
            className="flex items-center gap-1 text-[11px] font-mono-code font-bold text-neutral-800 hover:text-black py-1 px-2 rounded bg-black/5 hover:bg-black/10 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy Email</span>
              </>
            )}
          </button>
        </div>

        {submitted ? (
          <div className="py-12 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl mx-auto flex items-center justify-center">
              <Check className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900">Inquiry Prepared!</h3>
            <p className="text-xs sm:text-sm text-neutral-600 max-w-sm mx-auto">
              Opening your default mail client with your project specs addressed to <b>Supportfinity@gmail.com</b>.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono-code text-neutral-600 mb-1">YOUR NAME</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 border border-black/10 focus:outline-none focus:ring-2 focus:ring-neutral-900 text-neutral-900 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono-code text-neutral-600 mb-1">EMAIL / CONTACT</label>
                <input
                  type="email"
                  required
                  placeholder="sarah@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 border border-black/10 focus:outline-none focus:ring-2 focus:ring-neutral-900 text-neutral-900 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono-code text-neutral-600 mb-1">PROJECT SCOPE</label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 border border-black/10 focus:outline-none focus:ring-2 focus:ring-neutral-900 text-neutral-900 text-xs sm:text-sm"
                >
                  <option value="Product & UI Design">Product &amp; UI Design</option>
                  <option value="Design System & Tokens">Design System &amp; Tokens</option>
                  <option value="Mobile App UX (iOS/Android)">Mobile App UX (iOS/Android)</option>
                  <option value="Spatial WebGL & 3D Interactive">Spatial WebGL &amp; 3D Interactive</option>
                  <option value="Game UI & Shop HUD">Game UI &amp; Shop HUD</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono-code text-neutral-600 mb-1">TIMELINE</label>
                <select
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 border border-black/10 focus:outline-none focus:ring-2 focus:ring-neutral-900 text-neutral-900 text-xs sm:text-sm"
                >
                  <option value="Immediate (< 2 Weeks)">Immediate (&lt; 2 Weeks)</option>
                  <option value="Within 1-2 Months">Within 1-2 Months</option>
                  <option value="Q2 / Q3 2026">Q2 / Q3 2026</option>
                  <option value="Advisory / Consultation">Advisory / Consultation</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono-code text-neutral-600 mb-1">PROJECT DETAILS / GOALS</label>
              <textarea
                required
                rows={3}
                placeholder="Tell me a bit about your product, challenges, or aesthetic aspirations..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 border border-black/10 focus:outline-none focus:ring-2 focus:ring-neutral-900 text-neutral-900 text-xs sm:text-sm resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-black transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <span>Send Collaboration Request</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
