import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MessageCircle, Wallet as WalletIcon, Sparkles, ArrowRight, Check } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[hsl(40,30%,97%)] via-[hsl(160,20%,95%)] to-[hsl(40,30%,97%)]">
      <header className="px-6 md:px-10 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <img src={`${basePath}/logo.svg`} alt="Klave" className="h-9" />
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sign-in">
            <Button variant="ghost" className="rounded-full">Sign in</Button>
          </Link>
          <Link href="/sign-up">
            <Button className="rounded-full bg-[hsl(160,35%,45%)] hover:bg-[hsl(160,40%,40%)] text-white">
              Get started
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 md:px-10 pt-12 md:pt-20 pb-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 border border-[hsl(40,15%,90%)] text-sm">
              <Sparkles className="h-4 w-4 text-[hsl(160,35%,45%)]" />
              <span className="font-medium text-[hsl(160,15%,25%)]">Built for real estate coaches</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-[hsl(160,15%,15%)] leading-[1.05]">
              Sell your courses in a chat your students already love.
            </h1>

            <p className="text-lg text-[hsl(160,10%,40%)] leading-relaxed">
              Klave is the WhatsApp-style platform built for real estate investors, wholesalers, and educators.
              Create free or paid groups, get paid instantly, and teach hundreds of students at once.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link href="/sign-up">
                <Button size="lg" className="rounded-full bg-[hsl(160,35%,45%)] hover:bg-[hsl(160,40%,40%)] text-white px-7 h-12 text-base font-semibold">
                  Start your first group
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button size="lg" variant="outline" className="rounded-full px-7 h-12 text-base font-semibold border-[hsl(40,15%,85%)]">
                  I already have an account
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap gap-4 pt-3 text-sm text-[hsl(160,10%,40%)]">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[hsl(160,35%,45%)]" /> Free to start
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[hsl(160,35%,45%)]" /> Instant payouts
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[hsl(160,35%,45%)]" /> Built-in wallet
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-[hsl(160,35%,80%)]/40 to-[hsl(20,60%,80%)]/40 rounded-[2.5rem] blur-2xl" />
            <div className="relative bg-white rounded-[2rem] shadow-2xl border border-[hsl(40,15%,88%)] p-6 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-[hsl(40,15%,90%)]">
                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-[hsl(160,40%,55%)] to-[hsl(160,35%,40%)] flex items-center justify-center text-white font-bold">P</div>
                <div>
                  <div className="font-semibold text-[hsl(160,15%,20%)]">Property Investment Mastery</div>
                  <div className="text-xs text-[hsl(160,10%,50%)]">142 members</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex">
                  <div className="max-w-[80%] bg-[hsl(40,20%,94%)] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-[hsl(160,15%,20%)]">
                    What's the best way to find off-market deals?
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-[hsl(160,40%,55%)] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-white">
                    Direct mail + driving for dollars. I'll drop a full lecture in the group tomorrow.
                  </div>
                </div>
                <div className="flex">
                  <div className="max-w-[80%] bg-[hsl(40,20%,94%)] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-[hsl(160,15%,20%)]">
                    Just paid! When does class start?
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-[hsl(40,15%,90%)]">
                <div className="text-xs text-[hsl(160,10%,50%)]">Today's earnings</div>
                <div className="text-base font-bold text-[hsl(160,35%,40%)]">+$1,247.00</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-24">
          {[
            { icon: MessageCircle, title: "Chat-first teaching", desc: "Run your courses through familiar group chats. No clunky LMS." },
            { icon: WalletIcon, title: "Get paid instantly", desc: "Students pay, get added automatically. Your wallet fills in real time." },
            { icon: Sparkles, title: "AI lecture replication", desc: "Record once. Push the same lesson to all your groups in one tap." },
          ].map((f) => (
            <div key={f.title} className="bg-white/80 backdrop-blur rounded-2xl p-6 border border-[hsl(40,15%,90%)] shadow-sm">
              <div className="h-11 w-11 rounded-xl bg-[hsl(160,35%,45%)]/10 flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-[hsl(160,35%,40%)]" />
              </div>
              <h3 className="font-semibold text-lg text-[hsl(160,15%,18%)] mb-2">{f.title}</h3>
              <p className="text-sm text-[hsl(160,10%,42%)] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-[hsl(40,15%,90%)] py-6 text-center text-sm text-[hsl(160,10%,50%)]">
        Klave — Chat. Teach. Get paid.
      </footer>
    </div>
  );
}
