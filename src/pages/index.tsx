import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Translate, {translate} from '@docusaurus/Translate';
import {motion} from 'framer-motion';
import {
  Microscope,
  Languages,
  ArrowRight,
  BookOpen,
  ShieldCheck,
  Zap,
  Activity,
  Code2,
  Terminal,
  Sparkles,
  Heart,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

import CodeBlock from '@theme/CodeBlock';
import LogoOutline from '@site/src/components/LogoOutline';
import styles from './index.module.css';

function HeroBanner() {
  return (
    <header className={styles.hero}>
      <div className={styles.heroGlow} />
      <div className={styles.heroGrid} />
      <div className="container">
        <motion.div
          className={styles.heroInner}
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.8, ease: [0.4, 0, 0.2, 1]}}
        >
          <div className={styles.heroLogoWrap}>
            <LogoOutline size={120} variant="hero" />
          </div>

          <motion.div
            className={styles.heroBadge}
            initial={{opacity: 0, y: 10}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.6, delay: 0.25}}
          >
            <Sparkles size={14} />
            <span>
              <Translate id="home.badge">Live-verified Lua API reference</Translate>
            </span>
          </motion.div>

          <h1 className={styles.heroTitle}>
            <span className={styles.heroTitleAccent}>Serotonin</span>
            <span className={styles.heroTitleNormal}>
              {' '}
              <Translate id="home.title.suffix">Lua API Reference</Translate>
            </span>
          </h1>

          <p className={styles.heroTagline}>
            <Translate id="home.tagline">
              Honest, complete, up-to-date documentation for the Serotonin Lua sandbox. Every signature roundtripped against the live runtime.
            </Translate>
          </p>

          <motion.div
            className={styles.heroActions}
            initial={{opacity: 0, y: 10}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.6, delay: 0.4}}
          >
            <Link className={clsx('button button--primary button--lg', styles.actionBtn)} to="/docs/overview">
              <BookOpen size={18} />
              <Translate id="home.cta.start">Get started</Translate>
              <ArrowRight size={16} />
            </Link>
            <Link className={clsx('button button--secondary button--lg', styles.actionBtn)} to="/docs/libraries/utility">
              <Code2 size={18} />
              <Translate id="home.cta.browse">Browse libraries</Translate>
            </Link>
            <Link className={clsx('button button--secondary button--lg', styles.actionBtn)} to="/docs/llms">
              <Terminal size={18} />
              <Translate id="home.cta.npm">npm + MCP</Translate>
            </Link>
          </motion.div>

          <motion.div
            className={styles.heroStats}
            initial={{opacity: 0, y: 10}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.6, delay: 0.55}}
          >
            <div className={styles.statItem}>
              <ShieldCheck size={16} className={styles.statIcon} />
              <div>
                <div className={styles.statValue}>
                  <Translate id="home.stats.libs.value">14 libraries</Translate>
                </div>
                <div className={styles.statLabel}>
                  <Translate id="home.stats.libs.label">cheat-side, every function probed</Translate>
                </div>
              </div>
            </div>
            <div className={styles.statItem}>
              <Zap size={16} className={styles.statIcon} />
              <div>
                <div className={styles.statValue}>
                  <Translate id="home.stats.functions.value">~150 functions</Translate>
                </div>
                <div className={styles.statLabel}>
                  <Translate id="home.stats.functions.label">+ Instance / Part / Player / Vector3 / Color3</Translate>
                </div>
              </div>
            </div>
            <div className={styles.statItem}>
              <Activity size={16} className={styles.statIcon} />
              <div>
                <div className={styles.statValue}>
                  <Translate id="home.stats.build.value">build 390ba09</Translate>
                </div>
                <div className={styles.statLabel}>
                  <Translate id="home.stats.build.label">audited 2026-04-26</Translate>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </header>
  );
}

type Feature = {
  Icon: typeof Microscope;
  titleId: string; titleEn: string;
  descId: string;  descEn: string;
};

const FEATURES: Feature[] = [
  {
    Icon: Microscope,
    titleId: 'home.feature.verified.title', titleEn: 'Live-verified',
    descId:  'home.feature.verified.desc',
    descEn:  'Every signature confirmed by `pcall` introspection on a real Serotonin sandbox. No hearsay, no stale changelog.',
  },
  {
    Icon: Terminal,
    titleId: 'home.feature.cli.title', titleEn: 'npx-installable',
    descId:  'home.feature.cli.desc',
    descEn:  'Drop-in stdio MCP server published as `mcp-serotonin-docs`. One-click VSCode install, one-line Codex install.',
  },
  {
    Icon: AlertTriangle,
    titleId: 'home.feature.crashers.title', titleEn: 'Crashers documented',
    descId:  'home.feature.crashers.desc',
    descEn:  'Every native crasher we hit is on the page that exposes it: `audio.PlaySound` non-WAV, `cheat.LoadString`, `_G`, undocumented LocalPlayer fields.',
  },
  {
    Icon: Languages,
    titleId: 'home.feature.bilingual.title', titleEn: 'Bilingual',
    descId:  'home.feature.bilingual.desc',
    descEn:  'Full English and Russian translations side by side, kept in sync. Function names and error strings stay verbatim.',
  },
];

function Features() {
  return (
    <section className={styles.features}>
      <div className="container">
        <motion.h2
          className={styles.sectionTitle}
          initial={{opacity: 0, y: 20}}
          whileInView={{opacity: 1, y: 0}}
          viewport={{once: true, margin: '-100px'}}
          transition={{duration: 0.6}}
        >
          <Translate id="home.features.heading">What is in here</Translate>
        </motion.h2>
        <div className={styles.featureGrid}>
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.titleId}
              className="feature-card"
              initial={{opacity: 0, y: 20}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{once: true, margin: '-50px'}}
              transition={{duration: 0.5, delay: i * 0.08}}
            >
              <div className={styles.featureIconWrap}>
                <f.Icon size={24} strokeWidth={1.8} />
              </div>
              <h3 className={styles.featureTitle}>
                <Translate id={f.titleId}>{f.titleEn}</Translate>
              </h3>
              <p className={styles.featureDesc}>
                <Translate id={f.descId}>{f.descEn}</Translate>
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const QUICKSTART_CODE = `cheat.register("onPaint", function()
    draw.TextOutlined("Hello, Serotonin!", 20, 20,
                      Color3.fromRGB(255, 255, 255), "Verdana")
end)`;

function Quickstart() {
  return (
    <section className={styles.quickstart}>
      <div className="container">
        <motion.div
          initial={{opacity: 0, y: 20}}
          whileInView={{opacity: 1, y: 0}}
          viewport={{once: true, margin: '-100px'}}
          transition={{duration: 0.6}}
        >
          <h2 className={styles.sectionTitle}>
            <Translate id="home.qs.title">Quick start</Translate>
          </h2>
          <p className={styles.sectionLead}>
            <Translate id="home.qs.desc">
              Drop this file into C:\Serotonin\scripts\ and load it from the Scripting tab.
            </Translate>
          </p>
        </motion.div>

        <motion.div
          className={styles.codeFrame}
          initial={{opacity: 0, scale: 0.96}}
          whileInView={{opacity: 1, scale: 1}}
          viewport={{once: true, margin: '-100px'}}
          transition={{duration: 0.6, delay: 0.1}}
        >
          <CodeBlock language="lua" title="lua" showLineNumbers>
            {QUICKSTART_CODE}
          </CodeBlock>
        </motion.div>
      </div>
    </section>
  );
}

function StatusNotice() {
  return (
    <section className={styles.status}>
      <div className="container">
        <motion.div
          className={styles.statusCard}
          initial={{opacity: 0, y: 20}}
          whileInView={{opacity: 1, y: 0}}
          viewport={{once: true, margin: '-50px'}}
          transition={{duration: 0.6}}
        >
          <Activity size={20} className={styles.statusIcon} />
          <div>
            <strong>
              <Translate id="home.status.label">Coverage</Translate>
            </strong>
            <p className={styles.statusText}>
              <Translate id="home.status.text">
                14 cheat-side libraries (utility, memory, entity, game, cheat, bit, file, audio, mouse, keyboard, http, websocket, draw, ui) plus 5 userdata types (Instance, Part, Player, Vector3, Color3). Build version-390ba09e7e944154, runtime is LuaJIT 2.0.3 implementing Lua 5.1. Pages publish only after every signature is roundtripped against the live runtime via verify_all_api.lua.
              </Translate>
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function AuthorNote() {
  return (
    <section className={styles.author}>
      <div className="container">
        <motion.div
          className={styles.authorCard}
          initial={{opacity: 0, y: 20}}
          whileInView={{opacity: 1, y: 0}}
          viewport={{once: true, margin: '-50px'}}
          transition={{duration: 0.6}}
        >
          <Heart size={20} className={styles.authorHeart} />
          <div className={styles.authorBody}>
            <strong className={styles.authorTitle}>
              <Translate id="home.author.title">About this project</Translate>
            </strong>
            <p className={styles.authorText}>
              <Translate id="home.author.text">
                Built by DesirePro. I am not a Serotonin developer. The official docs at serotonin-1.gitbook.io have not been updated to match recent runtime changes, so this site exists to keep the community unblocked. Every page here is a hand-audit against a real cheat instance, not a copy of the upstream gitbook.
              </Translate>
            </p>
            <div className={styles.authorContacts}>
              <a
                className={styles.authorLink}
                href="https://t.me/DesirePro"
                target="_blank"
                rel="noopener noreferrer"
              >
                Telegram: @DesirePro
                <ExternalLink size={13} />
              </a>
              <span className={styles.authorDivider} aria-hidden>•</span>
              <span className={styles.authorContact}>Discord: <code>desirepro</code></span>
              <span className={styles.authorDivider} aria-hidden>•</span>
              <a
                className={styles.authorLink}
                href="https://github.com/DeftSolutions-dev/serotonin-api-docs"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description={translate({
        id: 'home.meta.desc',
        message: 'Live-verified Serotonin Lua API reference. Bilingual EN/RU docs with runnable examples.',
      })}>
      <HeroBanner />
      <main>
        <Features />
        <Quickstart />
        <StatusNotice />
        <AuthorNote />
      </main>
    </Layout>
  );
}
