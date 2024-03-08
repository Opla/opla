import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
      <div className="container px-10 py-40 text-center">
      <img src="img/logo.svg" alt="Opla Logo" className="w-12 h-12 animate-pulse" />
        <Heading as="h2" className="mx-auto my-2 text-4xl font-medium md:text-3xl">
          {siteConfig.tagline}
        </Heading>
        <h3 className="text-lg font-normal pb-4">Opla works using your machine processing power.</h3>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro">
            Soon available
          </Link>
        </div>
      </div>
  );
}

export default function Home(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description={siteConfig.tagline}>
      <HomepageHeader />
      <main>
      </main>
    </Layout>
  );
}
