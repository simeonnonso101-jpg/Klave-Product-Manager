import { Link } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Wallet as WalletIcon,
  Sparkles,
  ArrowRight,
  Check,
  Users,
  DollarSign,
  Zap,
  ChevronDown,
  Star,
} from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const PURPLE_GRADIENT = "bg-gradient-to-r from-[#5A1DE6] to-[#3A0CA3]";
const PURPLE_GRADIENT_HOVER = "hover:opacity-90";

const TESTIMONIALS = [
  {
    quote:
      "I moved my entire student community from Telegram to Klave in one weekend. Payments now happen in the chat itself.",
    name: "Marcus Tate",
    role: "Business Coach · 320 students",
    initial: "M",
  },
  {
    quote:
      "The AI replication feature is unfair. I record one lesson and it goes out — adapted — to every one of my paid groups.",
    name: "Lola Adediran",
    role: "Marketing Mentor · 184 students",
    initial: "L",
  },
  {
    quote:
      "My students felt the difference immediately. It feels like WhatsApp but I get paid in it.",
    name: "Devon Ochoa",
    role: "Design Educator · 91 students",
    initial: "D",
  },
];

const FAQS = [
  {
    q: "How much does Klave cost?",
    a: "Klave is free to start. You only pay a small fee on paid course transactions. No monthly subscription, no setup costs.",
  },
  {
    q: "How do I get paid?",
    a: "Earnings land in your in-app wallet the moment a student joins. Withdraw to your bank anytime — no waiting periods, no payout schedules.",
  },
  {
    q: "Can my students use Klave on their phones?",
    a: "Yes. Klave is built mobile-first and works in any browser. Students can install it to their home screen so it feels exactly like a native app.",
  },
  {
    q: "What is AI Lecture Replication?",
    a: "Record a lesson once in one of your groups. Klave's AI re-tones and re-frames it for every other group you pick — so you can teach hundreds of students at once without copy-pasting.",
  },
  {
    q: "Can I run free communities and paid courses together?",
    a: "Absolutely. Most creators keep a free funnel group and convert engaged members into their paid coaching circles, all from one dashboard.",
  },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[#F5F5F5] via-[hsl(258,40%,96%)] to-[#F5F5F5] text-[hsl(255,25%,12%)]">
      {/* Header */}
      <header className="px-4 sm:px-6 md:px-10 py-4 sm:py-5 flex items-center justify-between max-w-6xl mx-auto gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <img src={`${basePath}/logo.svg`} alt="Klave" className="h-7 sm:h-9" />
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/sign-in">
            <Button variant="ghost" size="sm" className="rounded-full text-sm sm:text-base px-3 sm:px-4">
              Sign in
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button
              size="sm"
              className={`rounded-full ${PURPLE_GRADIENT} ${PURPLE_GRADIENT_HOVER} text-white border-0 text-sm sm:text-base px-3 sm:px-5`}
            >
              Get started
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 pt-8 sm:pt-12 md:pt-20 pb-24">
        {/* Hero */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="space-y-5 sm:space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-[hsl(255,15%,90%)] text-xs sm:text-sm shadow-sm">
              <Sparkles className="h-4 w-4 text-[#5A1DE6]" />
              <span className="font-medium text-[hsl(255,25%,18%)]">Built for course creators</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[hsl(255,25%,12%)] leading-[1.05]">
              Sell your courses in a chat your students already love.
            </h1>

            <p className="text-base sm:text-lg text-[hsl(255,8%,42%)] leading-relaxed">
              Klave is the WhatsApp-style platform built for coaches, mentors, and educators of every kind.
              Create free or paid groups, get paid instantly, and teach hundreds of students at once.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link href="/sign-up" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className={`w-full sm:w-auto rounded-full ${PURPLE_GRADIENT} ${PURPLE_GRADIENT_HOVER} text-white border-0 px-7 h-12 text-base font-semibold shadow-lg shadow-[#5A1DE6]/25`}
                >
                  Start your first group
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/sign-in" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto rounded-full px-7 h-12 text-base font-semibold border-[hsl(255,15%,85%)] bg-white/60"
                >
                  I already have an account
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap gap-4 pt-3 text-sm text-[hsl(255,8%,42%)]">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[#5A1DE6]" /> Free to start
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[#5A1DE6]" /> Instant payouts
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[#5A1DE6]" /> Built-in wallet
              </span>
            </div>
          </div>

          {/* Hero card */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-[#5A1DE6]/30 to-[#F59E0B]/30 rounded-[2.5rem] blur-2xl" />
            <div className="relative bg-white rounded-[2rem] shadow-2xl border border-[hsl(255,15%,90%)] p-6 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-[hsl(255,15%,92%)]">
                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] flex items-center justify-center text-white font-bold">
                  P
                </div>
                <div>
                  <div className="font-semibold text-[hsl(255,25%,14%)]">Productivity Mastery</div>
                  <div className="text-xs text-[hsl(255,8%,50%)]">142 members</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex">
                  <div className="max-w-[80%] bg-[hsl(0,0%,96%)] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-[hsl(255,25%,18%)]">
                    What's the best framework for week-one of a new launch?
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-white shadow-md shadow-[#5A1DE6]/20">
                    Audience-first, then offer. I'll drop a full lecture in the group tomorrow.
                  </div>
                </div>
                <div className="flex">
                  <div className="max-w-[80%] bg-[hsl(0,0%,96%)] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-[hsl(255,25%,18%)]">
                    Just paid! When does class start?
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-[hsl(255,15%,92%)]">
                <div className="text-xs text-[hsl(255,8%,50%)]">Today's earnings</div>
                <div className="text-base font-bold text-[#5A1DE6] flex items-center gap-1.5">
                  +$1,247.00
                  <span className="inline-block w-2 h-2 rounded-full bg-[#F59E0B]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-20 sm:mt-24 grid grid-cols-3 gap-3 sm:gap-6 bg-white/80 backdrop-blur rounded-2xl sm:rounded-3xl border border-[hsl(255,15%,90%)] shadow-sm p-5 sm:p-8">
          {[
            { icon: Users, value: "10K+", label: "Students taught" },
            { icon: DollarSign, value: "$2.4M", label: "Paid to creators" },
            { icon: Zap, value: "<10s", label: "Avg. payout time" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="inline-flex items-center justify-center h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-[#5A1DE6]/10 text-[#5A1DE6] mb-2">
                <s.icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="text-xl sm:text-3xl font-bold text-[hsl(255,25%,14%)] tracking-tight">{s.value}</div>
              <div className="text-[11px] sm:text-sm text-[hsl(255,8%,50%)] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-20 sm:mt-24">
          {[
            { icon: MessageCircle, title: "Chat-first teaching", desc: "Run your courses through familiar group chats. No clunky LMS." },
            { icon: WalletIcon, title: "Get paid instantly", desc: "Students pay, get added automatically. Your wallet fills in real time." },
            { icon: Sparkles, title: "AI lecture replication", desc: "Record once. Push the same lesson to all your groups in one tap." },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-white/90 backdrop-blur rounded-2xl p-6 border border-[hsl(255,15%,90%)] shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] flex items-center justify-center mb-4 shadow-md shadow-[#5A1DE6]/25">
                <f.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold text-lg text-[hsl(255,25%,14%)] mb-2">{f.title}</h3>
              <p className="text-sm text-[hsl(255,8%,42%)] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <section className="mt-20 sm:mt-28">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F59E0B]/15 text-[#a35c00] text-xs sm:text-sm font-semibold mb-4">
              <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
              Loved by creators
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[hsl(255,25%,12%)]">
              Real creators. Real revenue.
            </h2>
            <p className="text-[hsl(255,8%,42%)] mt-3 text-base sm:text-lg">
              Hundreds of educators have already moved their students to Klave.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="bg-white rounded-2xl p-6 border border-[hsl(255,15%,90%)] shadow-sm flex flex-col"
              >
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-[#F59E0B] text-[#F59E0B]" />
                  ))}
                </div>
                <p className="text-[15px] text-[hsl(255,25%,18%)] leading-relaxed flex-1">"{t.quote}"</p>
                <div className="flex items-center gap-3 mt-5 pt-4 border-t border-[hsl(255,15%,92%)]">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] flex items-center justify-center text-white font-bold text-sm">
                    {t.initial}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-[hsl(255,25%,14%)] truncate">{t.name}</div>
                    <div className="text-xs text-[hsl(255,8%,50%)] truncate">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-20 sm:mt-28 max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[hsl(255,25%,12%)]">
              Questions, answered.
            </h2>
            <p className="text-[hsl(255,8%,42%)] mt-3 text-base sm:text-lg">
              Everything creators ask before starting their first group.
            </p>
          </div>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <button
                key={f.q}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left bg-white border border-[hsl(255,15%,90%)] rounded-2xl px-5 py-4 sm:px-6 sm:py-5 hover:border-[#5A1DE6]/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="font-semibold text-[hsl(255,25%,14%)] text-[15px] sm:text-base">{f.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-[#5A1DE6] shrink-0 mt-0.5 transition-transform duration-200 ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                  />
                </div>
                {openFaq === i && (
                  <p className="text-sm sm:text-[15px] text-[hsl(255,8%,42%)] leading-relaxed mt-3 pr-8">{f.a}</p>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mt-20 sm:mt-28">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] p-8 sm:p-14 text-center shadow-xl shadow-[#5A1DE6]/30">
            <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-[#F59E0B]/30 blur-3xl" />
            <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-white/20 blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight max-w-2xl mx-auto leading-tight">
                Your next 100 students are one chat away.
              </h2>
              <p className="text-white/80 mt-4 text-base sm:text-lg max-w-xl mx-auto">
                Start free. Get paid the moment a student joins. No credit card needed.
              </p>
              <Link href="/sign-up">
                <Button
                  size="lg"
                  className="mt-8 rounded-full bg-white text-[#5A1DE6] hover:bg-white/95 px-8 h-12 sm:h-14 text-base sm:text-lg font-semibold shadow-lg"
                >
                  Create my first group
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[hsl(255,15%,90%)] py-6 text-center text-sm text-[hsl(255,8%,50%)]">
        Klave — Chat. Teach. Get paid.
      </footer>
    </div>
  );
}
