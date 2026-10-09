import type { CSSProperties } from "react";
import CitationChart from "@/components/CitationChart";
import CountUp from "@/components/CountUp";
import NetworkBackdrop from "@/components/NetworkBackdrop";
import Publications, { SelectedPublications } from "@/components/Publications";
import Reveal from "@/components/Reveal";
import ThemeToggle from "@/components/ThemeToggle";
import {
  grants,
  modules,
  profile,
  publications,
  repos,
  scholarStats,
  supervision,
  themes,
} from "@/data/profile";
import styles from "./page.module.css";

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

// Stagger step for entrance and reveal animations, read by the CSS as --i.
const step = (i: number) => ({ "--i": i }) as CSSProperties;

// Theme tags read like detector output, "pig · drinking  0.94": split off the
// score so it can count up when the card's box locks on.
function splitTag(tag: string) {
  const m = tag.match(/^(.*\S)\s+0\.(\d+)$/);
  return m ? { label: m[1], score: Number(m[2]) } : { label: tag, score: null };
}

const nav = [
  { href: "#research", label: "Research" },
  { href: "#funding", label: "Funding" },
  { href: "#teaching", label: "Teaching" },
  { href: "#publications", label: "Publications" },
  { href: "#contact", label: "Contact" },
];

export default function Home() {
  const totalFunding = grants.reduce((s, g) => s + g.amount, 0);
  const ongoing = grants.filter((g) => g.status === "Ongoing");
  const ongoingTotal = ongoing.reduce((s, g) => s + g.amount, 0);
  const largestGrant = Math.max(...grants.map((g) => g.amount));

  return (
    <div className={styles.page}>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>

      <header className={styles.top}>
        <a href="#" className={styles.mark}>
          ali.alameer
        </a>
        <nav aria-label="Sections">
          <ul className={styles.nav}>
            {nav.map((n) => (
              <li key={n.href}>
                <a href={n.href}>{n.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <ThemeToggle />
      </header>

      <main id="main">
        {/* Hero ------------------------------------------------------- */}
        <section className={styles.hero} aria-labelledby="hero-name">
          <NetworkBackdrop />
          <p className={`${styles.eyebrow} ${styles.enter}`} style={step(0)}>
            {profile.role} · {profile.university}
          </p>
          <h1 id="hero-name" className={`${styles.name} ${styles.enter}`} style={step(1)}>
            <span className={styles.honorific}>{profile.honorific}</span> Ali{" "}
            <span className={styles.detect}>
              Alameer
              <span className={styles.box} aria-hidden="true">
                <span className={styles.boxLabel}>lecturer_in_ai 0.98</span>
              </span>
            </span>
          </h1>

          <div className={styles.heroGrid}>
            <div className={styles.heroText}>
              <p className={`${styles.lede} ${styles.enter}`} style={step(2)}>{profile.summary}</p>
              <p className={`${styles.credentials} ${styles.enter}`} style={step(3)}>
                {profile.phd}. {profile.senate}. {profile.school}.
              </p>
              <div className={`${styles.actions} ${styles.enter}`} style={step(4)}>
                <a className={styles.primary} href={`mailto:${profile.email}`}>
                  Email me
                </a>
                <a className={styles.secondary} href={profile.links.scholar} target="_blank" rel="noreferrer">
                  Google Scholar
                </a>
                <a className={styles.secondary} href={profile.links.github} target="_blank" rel="noreferrer">
                  GitHub
                </a>
              </div>
            </div>

            <aside className={`${styles.metrics} ${styles.enter}`} style={step(3)} aria-label="Citation metrics">
              <dl className={styles.stats}>
                <div>
                  <dt>Citations</dt>
                  <dd>
                    <CountUp value={scholarStats.citations.all} delay={500} />
                  </dd>
                </div>
                <div>
                  <dt>h-index</dt>
                  <dd>
                    <CountUp value={scholarStats.hIndex.all} delay={600} />
                  </dd>
                </div>
                <div>
                  <dt>i10-index</dt>
                  <dd>
                    <CountUp value={scholarStats.i10.all} delay={700} />
                  </dd>
                </div>
              </dl>
              <CitationChart />
            </aside>
          </div>
        </section>

        {/* Selected publications ---------------------------------- */}
        <section id="selected" className={styles.section} aria-labelledby="selected-h">
          <div className={styles.sectionHead} data-reveal>
            <p className={styles.eyebrow}>Selected publications</p>
            <h2 id="selected-h">Five most cited papers</h2>
            <p className={styles.intro}>
              Ranked by Google Scholar citations ({scholarStats.asOf}). The full list is in{" "}
              <a href="#publications">Publications</a> below.
            </p>
          </div>
          <div data-reveal>
            <SelectedPublications />
          </div>
        </section>

        {/* Research --------------------------------------------------- */}
        <section id="research" className={`${styles.section} ${styles.tinted}`} aria-labelledby="research-h">
          <div className={styles.sectionHead} data-reveal>
            <p className={styles.eyebrow}>Research</p>
            <h2 id="research-h">AI that has to work outside the lab</h2>
            <p className={styles.intro}>
              My group works on systems for messy, real environments: cameras over livestock pens,
              recorded court hearings, damp walls photographed by surveyors. Four strands run through
              the work.
            </p>
          </div>
          <div className={styles.themes}>
            {themes.map((t, i) => {
              const tag = splitTag(t.tag);
              return (
                <article key={t.id} className={styles.theme} data-reveal style={step(i % 2)}>
                  {/* decorative detector box and label, hidden from screen readers */}
                  <span className={styles.detBox} aria-hidden="true">
                    <span className={styles.detLabel}>
                      {tag.label}
                      {tag.score !== null && (
                        <span
                          className={styles.score}
                          style={{ "--score": tag.score } as CSSProperties}
                        />
                      )}
                    </span>
                  </span>
                  <h3>{t.title}</h3>
                  <p>{t.body}</p>
                  <p className={styles.themeMeta}>
                    {publications.filter((p) => p.theme === t.id).length} papers
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        {/* Funding ---------------------------------------------------- */}
        <section id="funding" className={styles.section} aria-labelledby="funding-h">
          <div className={styles.sectionHead} data-reveal>
            <p className={styles.eyebrow}>Funding</p>
            <h2 id="funding-h">Grants, KTPs and consultancy</h2>
            <p className={styles.intro}>
              <CountUp value={totalFunding} prefix="£" /> across {grants.length} awards, including {ongoing.length}{" "}
              projects in progress worth {gbp.format(ongoingTotal)}. Three of those are Innovate UK
              Knowledge Transfer Partnerships, each placing a KTP Associate inside the partner
              company.
            </p>
          </div>
          <div className={styles.tableWrap} data-reveal>
            {/* each award as a share of the total; the table below carries the figures */}
            <div className={styles.fundingBar} aria-hidden="true">
              {grants.map((g, i) => (
                <span
                  key={g.title}
                  data-status={g.status}
                  title={`${g.title}: ${gbp.format(g.amount)}`}
                  style={{ ...step(i), flexGrow: g.amount }}
                />
              ))}
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Project</th>
                  <th scope="col">Funder / partner</th>
                  <th scope="col">Type</th>
                  <th scope="col">Status</th>
                  <th scope="col" className={styles.num}>
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {grants.map((g, i) => (
                  <tr key={g.title} style={step(i)}>
                    <th scope="row">{g.title}</th>
                    <td data-label="Funder / partner">
                      {g.funder}
                      {g.partner ? <span className={styles.partner}> · {g.partner}</span> : null}
                    </td>
                    <td className={styles.kind} data-label="Type">
                      <span>{g.kind}</span>
                    </td>
                    <td data-label="Status">
                      <span className={styles.status} data-status={g.status}>
                        {g.status}
                      </span>
                    </td>
                    <td className={styles.num} data-label="Value">
                      {gbp.format(g.amount)}
                      <span
                        className={styles.valueBar}
                        aria-hidden="true"
                        style={{ "--share": g.amount / largestGrant } as CSSProperties}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Teaching & supervision ------------------------------------- */}
        <section id="teaching" className={`${styles.section} ${styles.tinted}`} aria-labelledby="teaching-h">
          <div className={styles.sectionHead} data-reveal>
            <p className={styles.eyebrow}>Teaching</p>
            <h2 id="teaching-h">Modules I designed and lead</h2>
            <p className={styles.intro}>
              I designed both modules on the MSc AI programme from scratch. Every lab is published as
              an open notebook repository so students, and anyone else, can work through it.
            </p>
          </div>

          <div className={styles.modules}>
            {modules.map((m, i) => (
              <a
                data-reveal
                style={step(i)}
                key={m.repo}
                className={styles.module}
                href={`${profile.links.github}/${m.repo}`}
                target="_blank"
                rel="noreferrer"
              >
                <span className={styles.moduleProg}>{m.programme}</span>
                <span className={styles.moduleName}>{m.name}</span>
                <span className={styles.moduleBlurb}>{m.blurb}</span>
                <span className={styles.moduleRepo}>
                  github.com/Ali-Alameer/{m.repo} · ★ {m.stars}
                </span>
              </a>
            ))}
          </div>

          <ul className={styles.repos} data-stagger>
            {repos.map((r) => (
              <li key={r.name}>
                <a href={`${profile.links.github}/${r.name}`} target="_blank" rel="noreferrer">
                  {r.name}
                </a>
                <span>{r.blurb}</span>
              </li>
            ))}
          </ul>

          <div className={styles.people} data-reveal>
            <div>
              <h3>Current research students</h3>
              <ul data-stagger>
                {supervision.current.map((s) => (
                  <li key={s.name}>
                    <span className={styles.personName}>
                      {s.name} <span className={styles.degree}>{s.degree}</span>
                    </span>
                    <span>{s.topic}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Completed doctorates</h3>
              <ul data-stagger>
                {supervision.completed.map((s) => (
                  <li key={s.name}>
                    <span className={styles.personName}>
                      {s.name} <span className={styles.degree}>{s.degree}</span>
                    </span>
                    <span>{s.topic}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>KTP Associates</h3>
              <ul data-stagger>
                {supervision.ktpAssociates.map((s) => (
                  <li key={s.name}>
                    <span className={styles.personName}>{s.name}</span>
                    <span>{s.topic}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Publications ----------------------------------------------- */}
        <section id="publications" className={styles.section} aria-labelledby="pubs-h">
          <div className={styles.sectionHead} data-reveal>
            <p className={styles.eyebrow}>Publications</p>
            <h2 id="pubs-h">Papers, 2015 to {Math.max(...publications.map((p) => p.year))}</h2>
            <p className={styles.intro}>
              Journal articles, conference papers and my PhD thesis. Citation counts are from Google
              Scholar ({scholarStats.asOf}). Titles link to the paper, or to a Scholar search where
              there is no DOI.
            </p>
          </div>
          <div data-reveal>
            <Publications />
          </div>
        </section>

        {/* Contact ---------------------------------------------------- */}
        <section id="contact" className={styles.contact} aria-labelledby="contact-h">
          <NetworkBackdrop />
          <div className={styles.contactInner} data-reveal>
          <p className={styles.eyebrow}>Contact</p>
          <h2 id="contact-h">
            Working on a vision or language problem? I&apos;m open to KTPs, PhD applicants and
            industry collaboration.
          </h2>
          <a className={styles.email} href={`mailto:${profile.email}`}>
            {profile.email}
          </a>
          <ul className={styles.contactLinks}>
            <li>
              <a href={profile.links.salford} target="_blank" rel="noreferrer">
                University of Salford profile
              </a>
            </li>
            <li>
              <a href={profile.links.repository} target="_blank" rel="noreferrer">
                Salford research repository
              </a>
            </li>
            <li>
              <a href={profile.links.scholar} target="_blank" rel="noreferrer">
                Google Scholar
              </a>
            </li>
            <li>
              <a href={profile.links.github} target="_blank" rel="noreferrer">
                GitHub
              </a>
            </li>
          </ul>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>
          © {new Date().getFullYear()} {profile.honorific} {profile.name}
        </span>
        <span>{profile.school}, {profile.university}, Salford, UK</span>
      </footer>
      <Reveal />
    </div>
  );
}
