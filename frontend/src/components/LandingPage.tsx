import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BellRing,
  CalendarCheck,
  Check,
  ChevronRight,
  CircleCheck,
  ClipboardCheck,
  FileText,
  HeartPulse,
  Languages,
  Menu,
  MessageCircle,
  Mic,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UsersRound,
  X,
} from "lucide-react";
import "./LandingPage.css";

interface LandingPageProps {
  onGetStarted: () => void;
}

const ownerCapabilities = [
  {
    icon: MessageCircle,
    title: "Start with what you know",
    copy: "Describe the animal and what has changed. Kizuna asks focused follow-up questions instead of expecting clinical language.",
  },
  {
    icon: HeartPulse,
    title: "Build a useful animal profile",
    copy: "Species, age, symptoms, history, medications, location, and other relevant details become a structured intake.",
  },
  {
    icon: CalendarCheck,
    title: "Arrive better prepared",
    copy: "When professional care is needed, the owner can share a concise case summary instead of beginning again from memory.",
  },
];

const clinicCapabilities = [
  {
    icon: Mic,
    title: "AI consultation scribe",
    copy: "Turn the consultation into a structured SOAP draft while the clinician stays focused on the patient.",
  },
  {
    icon: MessageCircle,
    title: "Care inbox",
    copy: "See organized owner intakes, missing information, safety flags, and cases waiting for human review.",
  },
  {
    icon: ClipboardCheck,
    title: "Referral-ready records",
    copy: "Carry the intake, consultation note, patient history, care plan, and handover context together.",
  },
  {
    icon: BellRing,
    title: "Follow-up without loose ends",
    copy: "Manage vaccinations, medication checks, wellness recalls, discharge follow-up, and the next appointment.",
  },
];

const careLoop = [
  {
    number: "01",
    title: "The owner tells the story",
    copy: "A pet owner or farmer starts a chat and describes the animal, the concern, and what has changed.",
  },
  {
    number: "02",
    title: "Kizuna clerks the case",
    copy: "The assistant gathers missing details, watches for urgent warning signs, and prepares a structured intake.",
  },
  {
    number: "03",
    title: "Care transfers with context",
    copy: "With the owner's consent, a receiving clinic can review the case summary before the consultation begins.",
  },
  {
    number: "04",
    title: "Follow-up stays connected",
    copy: "The approved note, owner instructions, reminders, and next appointment continue from the same patient story.",
  },
];

const reveal = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.16 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
};

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <div className="landing">
      <a className="landing__skip" href="#main">
        Skip to content
      </a>

      <header className="landing__nav-shell">
        <nav className="landing__nav" aria-label="Main navigation">
          <a className="landing__brand" href="#top" aria-label="Kizuna home">
            <img src="/logo.png" alt="" aria-hidden="true" />
            <span>Kizuna</span>
          </a>

          <div className="landing__nav-links">
            <a href="#care-assistant">For animal owners</a>
            <a href="#veterinary-teams">For veterinary teams</a>
            <a href="#care-loop">How it connects</a>
          </div>

          <div className="landing__nav-actions">
            <button className="button button--quiet" type="button" onClick={onGetStarted}>
              Sign in
            </button>
            <button className="button button--ink" type="button" onClick={onGetStarted}>
              View clinic workspace
              <ArrowRight aria-hidden="true" />
            </button>
          </div>

          <button
            className="landing__menu-button"
            type="button"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </nav>

        {mobileMenuOpen && (
          <div className="landing__mobile-nav" id="mobile-navigation">
            <a href="#care-assistant" onClick={closeMenu}>For animal owners</a>
            <a href="#veterinary-teams" onClick={closeMenu}>For veterinary teams</a>
            <a href="#care-loop" onClick={closeMenu}>How it connects</a>
            <button className="button button--ink" type="button" onClick={onGetStarted}>
              View clinic workspace
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
        )}
      </header>

      <main id="main">
        <section className="hero" id="top">
          <motion.div
            className="hero__copy"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="hero__signal">
              <Sparkles aria-hidden="true" />
              AI-assisted care for pets, farms, and veterinary teams
            </p>
            <h1>Tell the story once. Carry it through care.</h1>
            <p className="hero__lede">
              Kizuna helps pet and farm owners explain what is happening, builds a referral-ready animal profile, and
              gives veterinary teams the tools to document the visit and manage what happens next.
            </p>
            <div className="hero__actions">
              <a
                className="button button--accent button--large"
                href="https://t.me/openKizuna_bot"
                target="_blank"
                rel="noreferrer"
              >
                Try Kizuna Care
                <MessageCircle aria-hidden="true" />
              </a>
              <button className="button button--outline button--large" type="button" onClick={onGetStarted}>
                See the clinic workspace
                <ArrowRight aria-hidden="true" />
              </button>
            </div>
            <div className="hero__assurances" aria-label="Kizuna product principles">
              <span><CircleCheck aria-hidden="true" /> Pet and farm animal intake</span>
              <span><CircleCheck aria-hidden="true" /> Clinician-reviewed records</span>
              <span><CircleCheck aria-hidden="true" /> Available on Telegram now</span>
            </div>
          </motion.div>

          <motion.div
            className="hero__visual"
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.65, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
          >
            <figure className="hero__photo">
              <img
                src="/images/kizuna-vet-dog.jpg"
                alt="A veterinarian examining a dog beside its owner"
              />
            </figure>
            <div className="hero__conversation" aria-label="Example Kizuna care assistant conversation">
              <div className="conversation__head">
                <span className="conversation__mark"><MessageCircle aria-hidden="true" /></span>
                <div>
                  <strong>Kizuna Care</strong>
                  <span>Animal care assistant</span>
                </div>
                <span className="conversation__online">Available</span>
              </div>
              <div className="conversation__messages">
                <p className="message message--owner">
                  My dog has refused food since yesterday and seems unusually quiet.
                </p>
                <p className="message message--kizuna">
                  I can help prepare this for veterinary care. Has your dog vomited, had diarrhoea, or struggled to stand?
                </p>
              </div>
              <div className="conversation__status">
                <ShieldCheck aria-hidden="true" />
                Urgent concerns are routed for human review.
              </div>
            </div>
          </motion.div>
        </section>

        <section className="audience-rail" aria-label="Kizuna products">
          <a href="#care-assistant">
            <span>For pet owners, farmers, and animal caregivers</span>
            <strong>Kizuna Care assistant</strong>
            <ChevronRight aria-hidden="true" />
          </a>
          <a href="#veterinary-teams">
            <span>For hospitals, clinics, and field teams</span>
            <strong>Kizuna clinical workspace</strong>
            <ChevronRight aria-hidden="true" />
          </a>
        </section>

        <motion.section className="owner-product section" id="care-assistant" {...reveal}>
          <div className="owner-product__story">
            <p className="section__label">Kizuna for animal owners</p>
            <h2>A better first step when something feels wrong.</h2>
            <p>
              Kizuna turns an uncertain message into an organized intake. It asks the questions that are easy to forget,
              keeps the animal's profile together, and prepares the owner to reach professional care with useful context.
            </p>
            <div className="owner-product__notice">
              <Stethoscope aria-hidden="true" />
              <p>
                <strong>Support, not a replacement for a veterinarian.</strong>
                Kizuna does not diagnose or prescribe. It helps people describe the problem clearly, recognize when
                prompt care may be needed, and prepare for a veterinary professional.
              </p>
            </div>
          </div>

          <div className="owner-product__capabilities">
            {ownerCapabilities.map((capability) => {
              const Icon = capability.icon;
              return (
                <article key={capability.title}>
                  <Icon aria-hidden="true" />
                  <div>
                    <h3>{capability.title}</h3>
                    <p>{capability.copy}</p>
                  </div>
                </article>
              );
            })}
            <a
              className="owner-product__cta"
              href="https://t.me/openKizuna_bot"
              target="_blank"
              rel="noreferrer"
            >
              <span>
                <MessageCircle aria-hidden="true" />
                Start a care conversation on Telegram
              </span>
              <ArrowRight aria-hidden="true" />
            </a>
          </div>
        </motion.section>

        <motion.section className="clinic-product" id="veterinary-teams" {...reveal}>
          <div className="clinic-product__inner">
            <div className="clinic-product__heading">
              <div>
                <p className="section__label">Kizuna for veterinary teams</p>
                <h2>Less administrative work. More complete patient stories.</h2>
              </div>
              <p>
                Give the team one private workspace for owner intake, consultation documentation, patient history,
                follow-up, recalls, and the next appointment.
              </p>
            </div>

            <div className="clinic-product__body">
              <div className="clinic-product__features">
                {clinicCapabilities.map((capability) => {
                  const Icon = capability.icon;
                  return (
                    <article key={capability.title}>
                      <span><Icon aria-hidden="true" /></span>
                      <h3>{capability.title}</h3>
                      <p>{capability.copy}</p>
                    </article>
                  );
                })}
              </div>

              <div className="clinic-preview">
                <div className="clinic-preview__top">
                  <div>
                    <span>Consultation in progress</span>
                    <strong>Bingo · Canine · 4 years</strong>
                  </div>
                  <span className="clinic-preview__live"><i /> Recording</span>
                </div>
                <div className="clinic-preview__content">
                  <div className="clinic-preview__transcript">
                    <Mic aria-hidden="true" />
                    <p>“Owner reports reduced appetite since yesterday. No vomiting reported...”</p>
                    <span>Captured from consultation</span>
                  </div>
                  <div className="clinic-preview__note">
                    <div>
                      <span><FileText aria-hidden="true" /> SOAP draft</span>
                      <em>Needs review</em>
                    </div>
                    <dl>
                      <div><dt>Subjective</dt><dd>Reduced appetite for one day.</dd></div>
                      <div><dt>Objective</dt><dd>Hydration normal. Weight pending.</dd></div>
                      <div><dt>Plan</dt><dd>Complete examination and send owner instructions.</dd></div>
                    </dl>
                  </div>
                </div>
                <div className="clinic-preview__footer">
                  <span><ShieldCheck aria-hidden="true" /> Clinician approval required</span>
                  <button type="button" onClick={onGetStarted}>
                    Open workspace <ChevronRight aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section className="care-loop section" id="care-loop" {...reveal}>
          <div className="care-loop__heading">
            <div>
              <p className="section__label">The connected care loop</p>
              <h2>From first message to follow-up, without starting over.</h2>
            </div>
            <p>
              Kizuna Care prepares the case before the visit. The clinic workspace helps the veterinary team receive,
              document, and continue that care.
            </p>
          </div>
          <div className="care-loop__steps">
            {careLoop.map((step) => (
              <article key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </article>
            ))}
          </div>
        </motion.section>

        <section className="principles section">
          <div className="principles__lead">
            <p className="section__label">Designed for trust</p>
            <h2>AI prepares the work. Veterinary professionals make the decisions.</h2>
          </div>
          <div className="principles__list">
            <span><ShieldCheck aria-hidden="true" /> Veterinary decisions stay with veterinary professionals</span>
            <span><UsersRound aria-hidden="true" /> Each clinic operates in its own private workspace</span>
            <span><Languages aria-hidden="true" /> Owners receive clearer questions and easier-to-understand follow-up</span>
            <span><Check aria-hidden="true" /> Clinical drafts require review before finalization</span>
          </div>
        </section>

        <section className="final-cta">
          <div>
            <p className="section__label">Start from either side of care</p>
            <h2>Start the conversation. Keep the whole care journey connected.</h2>
          </div>
          <div className="final-cta__actions">
            <a
              className="button button--light button--large"
              href="https://t.me/openKizuna_bot"
              target="_blank"
              rel="noreferrer"
            >
              Chat with Kizuna Care
              <MessageCircle aria-hidden="true" />
            </a>
            <button className="button button--accent button--large" type="button" onClick={onGetStarted}>
              Explore the clinic workspace
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
        </section>
      </main>

      <footer className="landing__footer">
        <div>
          <a className="landing__brand landing__brand--footer" href="#top">
            <img src="/logo.png" alt="" aria-hidden="true" />
            <span>Kizuna</span>
          </a>
          <p>One connected patient story, from the owner's first message to the veterinary team's follow-up.</p>
        </div>
        <div className="landing__footer-links">
          <a href="#care-assistant">Animal owners</a>
          <a href="#veterinary-teams">Veterinary teams</a>
          <a href="#care-loop">How it connects</a>
        </div>
        <p className="landing__copyright">© 2026 Kizuna. Built from Africa for animal care everywhere.</p>
      </footer>
    </div>
  );
};
