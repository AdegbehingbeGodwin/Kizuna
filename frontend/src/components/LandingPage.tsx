import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { 
  Sparkles, 
  Zap, 
  Bot, 
  TrendingUp, 
  MessageSquare, 
  ArrowRight,
  Stethoscope,
  Send,
  Users,
  CheckCircle,
  Menu,
  X,
  Quote,
  Star,
  Play
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

// Animation Variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2
    }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } }
};

// Animated Counter Component
const AnimatedCounter: React.FC<{ target: number; suffix?: string; duration?: number }> = ({ 
  target, suffix = "", duration = 2 
}) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      let start = 0;
      const increment = target / (duration * 60);
      const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
          setCount(target);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 1000 / 60);
      return () => clearInterval(timer);
    }
  }, [isInView, target, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-amber-100 selection:text-amber-900 overflow-x-hidden">
      
      {/* Navigation - Dalmatian Black/White */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-stone-200 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.5 }}
              className="bg-stone-900 p-2.5 rounded-xl shadow-lg"
            >
              <Sparkles className="text-amber-400" size={22} />
            </motion.div>
            <span className="text-2xl font-black tracking-tight text-stone-900">
              Kizuna<span className="text-amber-500">.</span>
            </span>
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8 font-semibold text-sm text-stone-600">
            <a href="#features" className="hover:text-amber-600 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-amber-600 transition-colors">How It Works</a>
            <a href="#testimonials" className="hover:text-amber-600 transition-colors">Testimonials</a>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onGetStarted}
              className="bg-stone-900 text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-stone-800 transition-all shadow-lg"
            >
              Launch Dashboard
            </motion.button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-stone-600"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen ? "true" : "false"}
          >
            {mobileMenuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden absolute top-20 left-0 right-0 bg-white border-b border-stone-200 p-6 space-y-4 shadow-xl"
          >
            <a href="#features" className="block font-semibold text-stone-700 py-2">Features</a>
            <a href="#how-it-works" className="block font-semibold text-stone-700 py-2">How It Works</a>
            <a href="#testimonials" className="block font-semibold text-stone-700 py-2">Testimonials</a>
            <button 
              onClick={onGetStarted}
              className="w-full bg-stone-900 text-white py-3 rounded-xl font-bold"
            >
              Launch Dashboard
            </button>
          </motion.div>
        )}
      </motion.nav>

      {/* Hero Section */}
      <header className="relative pt-16 pb-24 lg:pt-20 lg:pb-32 overflow-hidden bg-gradient-to-b from-white to-stone-50">
        {/* Background Elements - Warm amber glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-gradient-to-br from-amber-100/50 to-orange-100/30 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-amber-50 to-yellow-50 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={prefersReducedMotion ? undefined : fadeInUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-stone-900 text-amber-400 text-xs font-bold uppercase tracking-widest mb-6">
              <Zap size={14} fill="currentColor" aria-hidden="true" />
              v2.0 Now Live — AI-First Platform
            </motion.div>
            <motion.h1 variants={fadeInUp} className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-stone-900 mb-6">
              The AI Operating System for{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
                Modern Vets.
              </span>
            </motion.h1>
            <motion.p variants={fadeInUp} className="text-lg text-stone-600 mb-8 max-w-lg leading-relaxed">
              Automate patient retention, generate personalized care campaigns, and grow your clinic revenue with the world's most intelligent veterinary assistant.
            </motion.p>
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4">
              <motion.button 
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={onGetStarted}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-lg font-bold px-8 py-4 rounded-2xl shadow-xl shadow-amber-200 hover:shadow-2xl hover:shadow-amber-300 transition-all"
              >
                Start Free Trial <ArrowRight size={20} />
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center gap-2 bg-white text-stone-700 border-2 border-stone-300 text-lg font-bold px-8 py-4 rounded-2xl hover:border-stone-400 hover:bg-stone-50 transition-all"
              >
                <Play size={18} fill="currentColor" /> Watch Demo
              </motion.button>
            </motion.div>
            
            {/* Quick Stats */}
            <motion.div variants={fadeInUp} className="flex flex-wrap gap-8 mt-12 pt-8 border-t border-stone-200">
              <div>
                <p className="text-3xl font-black text-stone-900"><AnimatedCounter target={10000} suffix="+" /></p>
                <p className="text-sm text-stone-500 font-medium">Reminders Sent</p>
              </div>
              <div>
                <p className="text-3xl font-black text-stone-900"><AnimatedCounter target={98} suffix="%" /></p>
                <p className="text-sm text-stone-500 font-medium">Delivery Rate</p>
              </div>
              <div>
                <p className="text-3xl font-black text-stone-900"><AnimatedCounter target={250} suffix="+" /></p>
                <p className="text-sm text-stone-500 font-medium">Happy Clinics</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Hero Image */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="hidden lg:block relative"
          >
            <div className="relative">
              <motion.img 
                src="/assets/hero_dashboard.png" 
                alt="Kizuna Dashboard Interface showing patient management and AI insights"
                className="w-full rounded-2xl shadow-2xl shadow-stone-400/30 border-2 border-white"
                animate={prefersReducedMotion ? undefined : { y: [0, -10, 0] }}
                transition={prefersReducedMotion ? undefined : { duration: 5, repeat: Infinity, ease: "easeInOut" }}
              />
              
              {/* Floating Badge 1 - Revenue */}
              <motion.div 
                animate={prefersReducedMotion ? undefined : { y: [0, 8, 0] }}
                transition={prefersReducedMotion ? undefined : { duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -left-6 top-1/3 bg-white p-4 rounded-xl shadow-lg shadow-stone-200 flex items-center gap-3 border border-stone-100"
              >
                <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-2 rounded-lg text-white">
                  <TrendingUp size={16} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">Revenue</p>
                  <p className="text-sm font-bold text-stone-900">+₦1.2M</p>
                </div>
              </motion.div>

              {/* Floating Badge 2 - AI */}
              <motion.div 
                animate={prefersReducedMotion ? undefined : { y: [0, -8, 0] }}
                transition={prefersReducedMotion ? undefined : { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute -right-4 bottom-20 bg-stone-900 p-4 rounded-xl shadow-lg flex items-center gap-3"
              >
                <div className="bg-amber-500 p-2 rounded-lg text-white">
                  <Bot size={16} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">AI Agent</p>
                  <p className="text-sm font-bold text-white">Active</p>
                </div>
              </motion.div>

              {/* Rating Badge */}
              <motion.div 
                animate={prefersReducedMotion ? undefined : { y: [0, 6, 0] }}
                transition={prefersReducedMotion ? undefined : { duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute right-8 top-6 bg-stone-900 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg"
              >
                <Star size={12} fill="#fbbf24" className="text-amber-400" aria-hidden="true" />
                <span className="text-xs font-bold text-white">4.9</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Trusted By Logos - Black text on white */}
      <section className="py-12 bg-white border-y border-stone-200">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs font-bold text-stone-400 uppercase tracking-widest mb-8">Trusted by innovative veterinary clinics</p>
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-4 items-center">
            {['VetCare+', 'PetPulse', 'Animalia', 'MediVet', 'PawSome', 'HealthyPaws'].map((brand, i) => (
              <span key={i} className="text-xl font-black text-stone-300 hover:text-stone-900 transition-colors cursor-default">{brand}</span>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-amber-600 font-bold text-sm uppercase tracking-widest mb-3">Simple Setup</p>
            <h2 className="text-3xl lg:text-4xl font-black text-stone-900 mb-4">Up and running in 3 steps</h2>
            <p className="text-stone-500 text-lg max-w-2xl mx-auto">No complex integrations. No IT team required. Just sign up and start sending.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              { step: 1, icon: Users, title: "Add Your Patients", desc: "Import your existing patient list or start fresh. Our OCR bot can even digitize paper records via Telegram." },
              { step: 2, icon: Bot, title: "AI Crafts Messages", desc: "Kizuna AI analyzes patient history and generates warm, personalized WhatsApp reminders automatically." },
              { step: 3, icon: Send, title: "Send & Track", desc: "One-click sending via WhatsApp. Track opens, replies and conversions in real-time." }
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="relative text-center group"
              >
                <div className="relative inline-block mb-6">
                  <div className="bg-stone-900 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-amber-400 shadow-lg group-hover:scale-105 transition-transform">
                    <item.icon size={28} aria-hidden="true" />
                  </div>
                  <div className="absolute -top-2 -right-2 bg-gradient-to-br from-amber-400 to-orange-500 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shadow-sm">
                    {item.step}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-2">{item.title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed max-w-xs mx-auto">{item.desc}</p>
                
                {/* Connector line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-stone-300 to-transparent" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section id="features" className="py-24 bg-stone-100">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="text-amber-600 font-bold text-sm uppercase tracking-widest mb-3">Powerful Features</p>
            <h2 className="text-3xl lg:text-4xl font-black text-stone-900 mb-4">Everything you need. Nothing you don't.</h2>
            <p className="text-stone-500 text-lg max-w-xl mx-auto">Built by vets, powered by AI. Kizuna handles the busywork so you can focus on the medicine.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: AI Reminders */}
            <motion.div 
              variants={scaleIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-stone-200 hover:shadow-lg hover:border-amber-200 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="bg-stone-900 w-12 h-12 rounded-xl flex items-center justify-center text-amber-400 flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg">
                  <Bot size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-stone-900">AI-Powered Reminders</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">
                    Forget generic templates. Our AI-powered engine crafts personalized, empathetic WhatsApp messages for vaccinations and checkups that owners actually read.
                  </p>
                </div>
              </div>
              
              {/* Mock Chat UI */}
              <div className="mt-6 flex flex-col gap-3">
                <div className="bg-stone-100 p-4 rounded-2xl rounded-bl-sm text-sm text-stone-700 max-w-[280px] border border-stone-200">
                  Hi Sarah! 👋 Bella is due for her Rabies booster. Book here: link.vet/kizuna
                </div>
                <div className="bg-stone-900 p-4 rounded-2xl rounded-br-sm text-sm text-white self-end max-w-[220px]">
                  Perfect! Tuesday at 2pm works 🐕
                </div>
              </div>
            </motion.div>

            {/* Card 2: Financials */}
            <motion.div 
              variants={scaleIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200 hover:shadow-lg hover:border-amber-200 transition-all group"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="bg-gradient-to-br from-amber-400 to-orange-500 w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-amber-200">
                  <TrendingUp size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1 text-stone-900">Revenue Tracking</h3>
                  <p className="text-stone-500 text-sm">Real-time conversions</p>
                </div>
              </div>
              <div className="flex items-end gap-1 h-20">
                {[40, 65, 45, 80, 60, 95, 75].map((h, i) => (
                  <motion.div 
                    key={i}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${h}%` }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="flex-1 bg-gradient-to-t from-amber-500 to-orange-400 rounded-t-md"
                  />
                ))}
              </div>
            </motion.div>

            {/* Card 3: Campaigns */}
            <motion.div 
              variants={scaleIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200 hover:shadow-lg hover:border-amber-200 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="bg-stone-900 w-12 h-12 rounded-xl flex items-center justify-center text-amber-400 flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg">
                  <MessageSquare size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-stone-900">Marketing Blasters</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">
                    One-click WhatsApp campaigns for Pet Birthdays, Free Deworming Days, and holiday promotions.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Card 4: Patient Records - Dark Card */}
            <motion.div 
              variants={scaleIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="lg:col-span-2 bg-stone-900 p-8 rounded-2xl shadow-xl text-white group"
            >
              <div className="flex items-start gap-4">
                <div className="bg-amber-500 w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                  <Stethoscope size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Complete Patient History</h3>
                  <p className="text-stone-400 text-sm leading-relaxed max-w-md">
                    Access breeds, weights, past visits, and owner details instantly. A beautiful, searchable database for your furry patients.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-6">
                {["Species", "Vaccination", "Last Visit", "Owner Contact", "Weight"].map(tag => (
                  <span key={tag} className="px-3 py-1.5 bg-white/10 rounded-lg text-xs font-semibold text-stone-300 backdrop-blur-sm">{tag}</span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-amber-600 font-bold text-sm uppercase tracking-widest mb-3">Testimonials</p>
            <h2 className="text-3xl lg:text-4xl font-black text-stone-900">Loved by clinics everywhere</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Dr. Awilagbara Ayorinde", clinic: "Catalyst Vet Clinic", quote: "Kizuna increased our appointment bookings by 40% in the first month. The AI messages feel so personal!", avatar: "🧑🏾‍⚕️" },
              { name: "Dr. Olatunbosun Agunbiade", clinic: "Ambit Veterinary", quote: "I was skeptical about AI, but Kizuna really understands pet owners. Our no-show rate dropped significantly.", avatar: "👨🏿‍⚕️" },
              { name: "Dr. Adeyi Muslimah", clinic: "Muslimah FurEver Friends", quote: "The campaign feature is a game-changer. We sent a deworming promo and booked 30 appointments!", avatar: "👩🏾‍⚕️" }
            ].map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-stone-50 p-6 rounded-2xl border border-stone-200 hover:border-amber-300 transition-all relative"
              >
                <Quote size={24} className="text-amber-200 absolute top-4 right-4" aria-hidden="true" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-3xl">{testimonial.avatar}</div>
                  <div>
                    <p className="font-bold text-stone-900 text-sm">{testimonial.name}</p>
                    <p className="text-xs text-stone-500">{testimonial.clinic}</p>
                  </div>
                </div>
                <p className="text-stone-600 text-sm leading-relaxed">"{testimonial.quote}"</p>
                <div className="flex gap-0.5 mt-4">
                  {[...Array(5)].map((_, j) => <Star key={j} size={14} fill="#f59e0b" className="text-amber-500" aria-hidden="true" />)}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section - Dalmatian Black + Golden Amber */}
      <section className="py-24 bg-stone-900 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl lg:text-5xl font-black text-white mb-6">Ready to grow your practice?</h2>
            <p className="text-xl text-stone-400 mb-10 max-w-2xl mx-auto">Join hundreds of clinics already using Kizuna to automate reminders, boost retention, and increase revenue.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onGetStarted}
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-lg font-bold px-10 py-4 rounded-2xl hover:shadow-xl hover:shadow-amber-500/20 transition-all"
              >
                Start Free Trial
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white/10 backdrop-blur-sm text-white border-2 border-white/20 text-lg font-bold px-10 py-4 rounded-2xl hover:bg-white/20 transition-all"
              >
                Schedule Demo
              </motion.button>
            </div>
            <p className="text-stone-500 text-sm mt-8 flex items-center justify-center gap-2">
              <CheckCircle size={16} className="text-amber-500" /> No credit card required • 14-day free trial
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer - Dalmatian Dark */}
      <footer className="bg-stone-950 py-16 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-stone-800 p-2 rounded-xl">
                  <Sparkles className="text-amber-400" size={18} />
                </div>
                <span className="text-xl font-black">Kizuna</span>
              </div>
              <p className="text-stone-500 text-sm">The AI-powered operating system for modern veterinary clinics.</p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm text-stone-300">Product</h4>
              <ul className="space-y-2 text-sm text-stone-500">
                <li><a href="#" className="hover:text-amber-400 transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-amber-400 transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-amber-400 transition-colors">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm text-stone-300">Company</h4>
              <ul className="space-y-2 text-sm text-stone-500">
                <li><a href="#" className="hover:text-amber-400 transition-colors">About</a></li>
                <li><a href="#" className="hover:text-amber-400 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-amber-400 transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm text-stone-300">Legal</h4>
              <ul className="space-y-2 text-sm text-stone-500">
                <li><a href="#" className="hover:text-amber-400 transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-amber-400 transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-amber-400 transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-stone-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-stone-600">© 2026 Kizuna Inc. All rights reserved.</p>
            <p className="text-sm text-stone-600">Made with ❤️ for veterinarians worldwide</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
