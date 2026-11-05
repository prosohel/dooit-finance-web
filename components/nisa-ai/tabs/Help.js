'use client';

import React, { useMemo, useState } from 'react';
import {
  IconArrowLeft,
  IconBook2,
  IconChevronRight,
  IconFileSearch,
  IconMessageCircle,
  IconScale,
  IconSearch,
  IconShieldCheck,
  IconSparkles,
} from '@tabler/icons-react';

const COLLECTIONS = [
  {
    id: 'nisa',
    title: 'Using Nisa',
    description: 'Chat, conversations, and what Nisa can answer',
    icon: IconSparkles,
    articles: [
      {
        id: 'what-nisa-does',
        title: 'What Nisa can help with',
        updated: 'Updated this week',
        body: [
          'Nisa is your Risk & Compliance assistant. Ask about AML policy, KYC requirements, monitoring thresholds, sanctions matches, and open cases.',
          'Start from Home with a suggested prompt, or type your own question. Nisa uses your organisation’s policies and case context — not general web search — so answers stay grounded in what you actually follow.',
        ],
      },
      {
        id: 'start-conversation',
        title: 'Start and resume a conversation',
        updated: 'Updated this week',
        body: [
          'Open Conversations to see threads that need you, are still open, or have been submitted. Select a thread to pick it up where you left off.',
          'Use Start a conversation when the topic is new. Keep one thread per case or policy question so the history stays usable for audit follow-up.',
        ],
      },
      {
        id: 'when-to-escalate',
        title: 'When to raise a ticket instead',
        updated: 'Updated last month',
        body: [
          'Use chat for guidance and drafting. Raise a ticket when a decision needs a named owner, a filing deadline, or evidence attached for the case file.',
          'If Nisa flags a gap or a match you cannot close from chat, move it to Tickets so it enters the compliance workflow.',
        ],
      },
    ],
  },
  {
    id: 'aml',
    title: 'AML & policy',
    description: 'Internal rules, SAR windows, and control updates',
    icon: IconScale,
    articles: [
      {
        id: 'aml-requirements',
        title: 'Current AML policy requirements',
        updated: 'Updated this week',
        body: [
          'Ask Nisa “What are our current AML policy requirements?” to get the controls that apply to your role, not a generic checklist.',
          'Policy answers cite the internal document Nisa is reading. If two versions conflict, treat the latest approved control as source of truth and flag the mismatch in a ticket.',
        ],
      },
      {
        id: 'sar-window',
        title: 'SAR filing windows',
        updated: 'Updated last month',
        body: [
          'Filing clocks start when suspicion is formed, not when the alert first fired. Ask Nisa for the window that applies to the customer type and corridor.',
          'Correspondent-bank SARs often have a tighter path. If the thread status is Waiting on you, the clock is still running on your side.',
        ],
      },
    ],
  },
  {
    id: 'kyc',
    title: 'KYC & onboarding',
    description: 'Refresh cycles, PEPs, and exceptions',
    icon: IconShieldCheck,
    articles: [
      {
        id: 'kyc-high-risk',
        title: 'KYC for high-risk customers',
        updated: 'Updated this week',
        body: [
          'High-risk and PEP customers need enhanced due diligence: source of wealth, expected activity, and a documented refresh cycle.',
          'Ask Nisa to explain the KYC pack for a risk rating. Attach the customer profile in chat when you need the answer tied to a specific file.',
        ],
      },
      {
        id: 'onboarding-exception',
        title: 'Onboarding exception requests',
        updated: 'Updated last month',
        body: [
          'Exceptions are recorded decisions, not shortcuts. State the control being waived, the compensating check, and the expiry.',
          'Nisa can draft the exception note. A named reviewer still has to accept it before onboarding can proceed.',
        ],
      },
    ],
  },
  {
    id: 'monitoring',
    title: 'Monitoring & cases',
    description: 'Thresholds, alerts, and investigation support',
    icon: IconFileSearch,
    articles: [
      {
        id: 'reporting-thresholds',
        title: 'Regulatory reporting thresholds',
        updated: 'Updated this week',
        body: [
          'Ask which transactions exceed reporting thresholds. Nisa will use the rules loaded for your jurisdiction and product set.',
          'Threshold hits are not automatically reportable. Confirm customer context and aggregation before you file.',
        ],
      },
      {
        id: 'sanctions-match',
        title: 'Working a sanctions list match',
        updated: 'Updated last month',
        body: [
          'Treat an inbound-wire sanctions hit as a hold until true-match or false-positive is documented.',
          'Ask Nisa to compare list fields against the customer record. If names, DOB, or geography only partially align, say so in the case note — do not clear on a close name alone.',
        ],
      },
    ],
  },
];

const ALL_ARTICLES = COLLECTIONS.flatMap((collection) =>
  collection.articles.map((article) => ({
    ...article,
    collectionId: collection.id,
    collectionTitle: collection.title,
  }))
);

export default function Help() {
  const [query, setQuery] = useState('');
  const [collectionId, setCollectionId] = useState(null);
  const [articleId, setArticleId] = useState(null);

  const selectedCollection = COLLECTIONS.find((c) => c.id === collectionId);
  const selectedArticle = ALL_ARTICLES.find((a) => a.id === articleId);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return ALL_ARTICLES.filter(
      (article) =>
        article.title.toLowerCase().includes(q) ||
        article.collectionTitle.toLowerCase().includes(q) ||
        article.body.some((p) => p.toLowerCase().includes(q))
    );
  }, [query]);

  const isSearching = query.trim().length > 0;

  const goBrowse = () => {
    setCollectionId(null);
    setArticleId(null);
  };

  const openCollection = (id) => {
    setCollectionId(id);
    setArticleId(null);
    setQuery('');
  };

  const openArticle = (id) => {
    const article = ALL_ARTICLES.find((a) => a.id === id);
    setArticleId(id);
    setCollectionId(article?.collectionId ?? null);
    setQuery('');
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col pt-12">
      <div className="px-4 pb-3">
        <label className="relative block">
          <span className="sr-only">Search help articles</span>
          <IconSearch
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setArticleId(null);
            }}
            placeholder="Search for help"
            className="h-10 w-full rounded-xl border border-border/80 bg-smoke-200/50 pr-3 pl-9 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/30 focus:bg-white focus:ring-2 focus:ring-primary/20"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {selectedArticle && !isSearching ? (
          <ArticleView
            article={selectedArticle}
            onBack={() => setArticleId(null)}
          />
        ) : isSearching ? (
          <SearchResults
            query={query.trim()}
            results={searchResults}
            onSelect={openArticle}
          />
        ) : selectedCollection ? (
          <CollectionView
            collection={selectedCollection}
            onBack={goBrowse}
            onSelect={openArticle}
          />
        ) : (
          <BrowseView onSelectCollection={openCollection} />
        )}
      </div>
    </div>
  );
}

function BrowseView({ onSelectCollection }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 px-2">
        <IconBook2 size={14} className="text-primary" />
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Collections
        </p>
      </div>
      <ul>
        {COLLECTIONS.map((collection) => {
          const Icon = collection.icon;
          return (
            <li key={collection.id}>
              <button
                type="button"
                onClick={() => onSelectCollection(collection.id)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-smoke-200/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                  <Icon size={18} stroke={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-heading">
                    {collection.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {collection.articles.length} articles · {collection.description}
                  </span>
                </span>
                <IconChevronRight
                  size={16}
                  className="shrink-0 text-muted-foreground/60"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CollectionView({ collection, onBack, onSelect }) {
  const Icon = collection.icon;
  return (
    <section>
      <button
        type="button"
        onClick={onBack}
        className="mb-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-primary hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
      >
        <IconArrowLeft size={14} />
        All collections
      </button>
      <div className="mb-3 flex items-start gap-3 px-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
          <Icon size={18} stroke={1.75} />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold text-heading">
            {collection.title}
          </h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {collection.description}
          </p>
        </div>
      </div>
      <ArticleList articles={collection.articles} onSelect={onSelect} />
    </section>
  );
}

function SearchResults({ query, results, onSelect }) {
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-10 text-center">
        <span className="mb-3 flex size-10 items-center justify-center rounded-xl bg-smoke-200 text-muted-foreground">
          <IconSearch size={18} />
        </span>
        <p className="text-[13px] font-semibold text-heading">
          No articles for “{query}”
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
          Try a policy name, KYC, SAR, or “using Nisa”. You can also ask Nisa
          from Home.
        </p>
      </div>
    );
  }

  return (
    <section>
      <p className="mb-2 px-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {results.length} {results.length === 1 ? 'result' : 'results'}
      </p>
      <ul>
        {results.map((article) => (
          <li key={article.id}>
            <button
              type="button"
              onClick={() => onSelect(article.id)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-smoke-200/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-heading">
                  {article.title}
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {article.collectionTitle}
                </span>
              </span>
              <IconChevronRight
                size={16}
                className="shrink-0 text-muted-foreground/60"
              />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ArticleList({ articles, onSelect }) {
  return (
    <ul>
      {articles.map((article) => (
        <li key={article.id}>
          <button
            type="button"
            onClick={() => onSelect(article.id)}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-smoke-200/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
          >
            <IconMessageCircle
              size={16}
              className="mt-0.5 shrink-0 text-primary/70"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-heading">
                {article.title}
              </span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                {article.updated}
              </span>
            </span>
            <IconChevronRight
              size={16}
              className="shrink-0 text-muted-foreground/60"
            />
          </button>
        </li>
      ))}
    </ul>
  );
}

function ArticleView({ article, onBack }) {
  return (
    <article className="px-2 pb-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-1 rounded-md px-1 py-1 text-[12px] font-medium text-primary hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
      >
        <IconArrowLeft size={14} />
        {article.collectionTitle}
      </button>
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {article.collectionTitle}
      </p>
      <h2 className="mt-1 text-[17px] leading-snug font-semibold tracking-tight text-heading">
        {article.title}
      </h2>
      <p className="mt-1 text-[11px] text-muted-foreground">{article.updated}</p>
      <div className="mt-4 space-y-3">
        {article.body.map((paragraph) => (
          <p
            key={paragraph.slice(0, 24)}
            className="text-[13px] leading-relaxed text-foreground/90"
          >
            {paragraph}
          </p>
        ))}
      </div>
    </article>
  );
}
