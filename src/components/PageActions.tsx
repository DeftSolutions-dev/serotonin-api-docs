import React, { useState } from 'react';
import { useLocation } from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './PageActions.module.css';

const REPO        = 'DeftSolutions-dev/serotonin-api-docs';
const BRANCH      = 'main';
const CHEAT_MCP   = 'https://github.com/DeftSolutions-dev/mcp-serotonin';
const DOCS_MCP_PKG = 'mcp-serotonin-docs';

function rawGithubUrl(pathname: string): string {
  const m = pathname.match(/\/docs\/(.+?)\/?$/);
  const slug = m ? m[1] : 'overview';
  const isRu = pathname.includes('/ru/docs/');
  const path = isRu
    ? `i18n/ru/docusaurus-plugin-content-docs/current/${slug}.md`
    : `docs/${slug}.md`;
  return `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${path}`;
}

async function copyMarkdownToClipboard(rawUrl: string): Promise<void> {
  try {
    const res = await fetch(rawUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    await navigator.clipboard.writeText(text);
    alert(`Copied ${text.length} bytes of Markdown to clipboard.`);
  } catch (e) {
    alert(`Could not copy: ${e}`);
  }
}

function vscodeInstallUrl(): string {
  const payload = {
    name: 'serotonin-docs',
    command: 'npx',
    args: ['-y', DOCS_MCP_PKG],
  };
  return `vscode:mcp/install?${encodeURIComponent(JSON.stringify(payload))}`;
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    alert(`Copied:\n\n${text}\n\nPaste into your terminal.`);
  } catch (e) {
    alert(`Could not copy: ${e}\n\nRun manually:\n${text}`);
  }
}

export default function PageActions(): JSX.Element {
  const location = useLocation();
  const { i18n } = useDocusaurusContext();
  const [open, setOpen] = useState(false);
  const rawUrl = rawGithubUrl(location.pathname);
  const isRu   = i18n.currentLocale === 'ru';

  const codexInstall = `codex mcp add serotonin-docs -- npx -y ${DOCS_MCP_PKG}`;

  const L = isRu
    ? {
        actions: 'Действия',
        copyMd:  'Копировать как Markdown',
        copySub: 'Скопировать страницу как .md',
        viewMd:  'Открыть raw Markdown',
        viewSub: 'Прямая ссылка на исходный .md в GitHub',
        sectionMcp: 'MCP-серверы',
        cheatMcp:  'Cheat-MCP (управление Serotonin)',
        cheatMcpSub: 'mcp-serotonin: 30 tools для live-чита',
        vscode:   'Установить в VSCode',
        vscodeSub: 'Открыть VSCode и добавить docs-MCP в один клик',
        codex:    'Команда для Codex',
        codexSub:  'Скопировать команду установки docs-MCP',
      }
    : {
        actions: 'Actions',
        copyMd:  'Copy as Markdown',
        copySub: 'Copy this page as .md',
        viewMd:  'View raw Markdown',
        viewSub: 'Direct link to the source .md on GitHub',
        sectionMcp: 'MCP servers',
        cheatMcp:  'Cheat MCP (drive Serotonin)',
        cheatMcpSub: 'mcp-serotonin: 30 tools for the live cheat',
        vscode:   'Install in VSCode',
        vscodeSub: 'Open VSCode and add the docs MCP in one click',
        codex:    'Command for Codex',
        codexSub:  'Copy install command for the docs MCP',
      };

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {L.actions}
        <span className={styles.caret}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          <button
            className={styles.item}
            onClick={() => { copyMarkdownToClipboard(rawUrl); setOpen(false); }}
          >
            <strong>{L.copyMd}</strong>
            <small>{L.copySub}</small>
          </button>

          <a
            className={styles.item}
            href={rawUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            <strong>{L.viewMd}</strong>
            <small>{L.viewSub}</small>
          </a>

          <div className={styles.section}>{L.sectionMcp}</div>

          <a
            className={styles.item}
            href={CHEAT_MCP}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            <strong>{L.cheatMcp}</strong>
            <small>{L.cheatMcpSub}</small>
          </a>

          <a
            className={styles.item}
            href={vscodeInstallUrl()}
            onClick={() => setOpen(false)}
          >
            <strong>{L.vscode}</strong>
            <small>{L.vscodeSub}</small>
          </a>

          <button
            className={styles.item}
            onClick={() => { copyText(codexInstall); setOpen(false); }}
          >
            <strong>{L.codex}</strong>
            <small><code>{codexInstall}</code></small>
          </button>
        </div>
      )}
    </div>
  );
}
