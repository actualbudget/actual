import Layout from '@theme/Layout';
import ThemedImage from '@theme/ThemedImage';
import Link from '@docusaurus/Link';

import Button from '../components/Button';

import classes from './index.module.css';

export default function Hello() {
  return (
    <Layout title="Actual" style={{ position: 'relative' }}>
      <img alt="" src="/img/homepage/hero-bg.svg" className={classes.heroBg} />

      <div className={`${classes.main} ${classes.container}`}>
        <h1>Your Finances — made simple</h1>
        <p className={classes.heroText}>
          Actual Budget is a super fast and privacy-focused app for managing
          your finances. At its heart is the well proven and much loved Envelope
          Budgeting methodology.
          <br />
          <strong>You own your data</strong> and can do whatever you want with
          it. Featuring multi-device sync, optional end-to-end encryption and so
          much more.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1em' }}>
          <div>
            <Button primary to="https://www.pikapods.com/pods?run=actual">
              Set up on PikaPods in 2 minutes
              <sup
                style={{
                  lineHeight: 0,
                  fontSize: '0.75em',
                  display: 'inline-block',
                  transform: 'translateY(0.1em)',
                }}
              >
                *
              </sup>{' '}
              <span aria-hidden="true">↗</span>
            </Button>
            <Button to="/docs/install/">Set up manually</Button>
          </div>
        </div>
        <div className={classes.heroImage}>
          <ThemedImage
            sources={{
              light: '/img/homepage/actual-main-budget.png',
              dark: '/img/homepage/actual-main-budget-dark.png',
            }}
            alt="Actual Budget"
          />
          <Button
            to="https://demo.actualbudget.org/"
            className={classes.demoButton}
          >
            <div className={classes.demoButtonContent}>
              <div style={{ width: 24, height: 24 }}>{icons.play}</div> Try the
              demo
            </div>
          </Button>
        </div>

        <MediumFeature
          title="Be involved in your financial decisions"
          src="/img/homepage/superpowers.svg"
        >
          Automated finance tools are great, except when they aren’t. We provide
          you with tools that are quick to use, but ultimately{' '}
          <strong>you are in control</strong>. We help you learn, instead of
          dictating.
        </MediumFeature>

        <MediumFeature
          flip
          title="Meticulously designed for speed"
          media={
            <video
              loop
              muted
              autoPlay
              playsInline
              src="/img/homepage/design.mp4"
              style={{ width: '100%' }}
            />
          }
        >
          A <strong>beautifully designed interface</strong> is fine-tuned to get
          out of your way and make it as fast as possible to explore your
          finances.
        </MediumFeature>

        <MediumFeature
          title="Unabashedly local-first software"
          src="/img/homepage/local-first.svg"
        >
          <strong>Actual is a local app, plain and simple.</strong> Your data is
          synced in the background so all devices have access, but the app
          totally works regardless of your network connection. This also allows{' '}
          <Link to="/docs/getting-started/sync#end-to-end-encryption">
            end-to-end encryption
          </Link>{' '}
          to keep your data private.
        </MediumFeature>

        <div id="features" />
        <BigFeature
          title="Powerful budgeting made simple"
          srcLight="/img/homepage/actual-main-budget.png"
          srcDark="/img/homepage/actual-main-budget-dark.png"
        >
          <strong>
            Save hundreds of dollars a year (at least!) by tracking your
            spending.
          </strong>{' '}
          Based on tried and true methods, our budgeting system is based off of
          your real income instead of made up numbers. This makes you face your
          real spending, and clearly shows how much you are saving each month.
          We make this process as simple as possible.{' '}
          <Link to="/docs/budgeting/">Learn&nbsp;more</Link>
        </BigFeature>

        <BigFeature
          title="The fastest way to manage transactions"
          srcLight="/img/homepage/actual-main-transaction.png"
          srcDark="/img/homepage/actual-main-transaction-dark.png"
        >
          Breeze through your transactions and update them easily with a
          streamlined, minimal interface. Categorizing your transactions
          correctly is important and we’ve optimized this process. Manage split
          transactions and transfers all in the same editor.
        </BigFeature>

        <BigFeature
          title="Oh my, the reports"
          srcLight="/img/homepage/actual-report-dashboard-light.png"
          srcDark="/img/homepage/actual-report-dashboard-dark.png"
        >
          Intuitive reports give you a quick way to learn about your finances.
          By default, we include net worth and cash flow reports. Actual also
          includes a powerful custom report engine to design your own reports to
          fit your needs.
        </BigFeature>
      </div>

      <div className={classes.featuresSection}>
        <img
          alt=""
          src="/img/homepage/features-bg.svg"
          className={classes.featuresBg}
        />

        <h2 className={`${classes.featuresSectionHeader} serif-header`}>
          So many features!
        </h2>
        <div className={`${classes.smallFeaturesGrid} ${classes.container}`}>
          <SmallFeature
            title="Everything in one place"
            icon={icons.smileyBlessedAlternate}
            learnMore="/docs/accounts/"
          >
            Add all of your accounts and track everything in one place. Get
            valuable information like net worth from all your accounts together.
          </SmallFeature>
          <SmallFeature
            title="Syncing across devices"
            icon={icons.synchronizeArrows1}
            learnMore="/docs/accounts/"
          >
            Self-host our syncing service. It’s easy to set up, but uses
            sophisticated distributed systems technology to sync changes across
            any number of devices.
          </SmallFeature>
          <SmallFeature
            title="Bank Sync"
            icon={icons.bank}
            learnMore="/docs/advanced/bank-sync"
          >
            Actual has built in support for bank syncing using goCardless
            (EU/UK) and SimpleFIN (US/Canada).
          </SmallFeature>
          <SmallFeature
            title="Envelope Style Budgeting"
            icon={icons.wallet}
            learnMore="/docs/budgeting/"
          >
            Use the power of envelope budgeting to get on top of your finances.
            You can only budget cash you have on hand, which means your budget
            stays realistic and you don't make numbers up.
          </SmallFeature>
          <SmallFeature
            title="Transfers"
            icon={icons.dataTransferHorizontal}
            learnMore="/docs/transactions/transfers"
          >
            Manage transfers easily by creating transfer transactions. Actual
            will link the transactions on both sides and update them together.
          </SmallFeature>
          <SmallFeature
            title="Importing Transactions"
            icon={icons.commonFileDownload}
            learnMore="/docs/transactions/importing"
          >
            Import transactions from the most popular financial files: QIF, OFX,
            QFX, CAMT.053 and CSV.
          </SmallFeature>
          <SmallFeature
            title="Undo & redo"
            icon={icons.rotateBack}
            learnMore="/docs/getting-started/tips-tricks#undo-redo"
          >
            A robust undo system allows you to rollback any changes you make,
            and redo them if desired. Never worry about making mistakes.
          </SmallFeature>
          <SmallFeature
            title="Migrate your data"
            icon={icons.realEstateTruckHouse}
            learnMore="/docs/migration/"
          >
            We provide builtin YNAB4 & nYNAB importers that keep all of your
            history. There are many more available from the Actual Community.
          </SmallFeature>
          <SmallFeature title="Dark Mode" icon={icons.moon}>
            Choose your own style with a built in dark mode and dynamic theming
            using your system default.
          </SmallFeature>
          <SmallFeature
            title="API"
            icon={icons.hierarchy1}
            learnMore="/docs/api/"
          >
            If you're a developer, we got you. Use our fully-featured API to
            write custom importers or build your own features. This API simply
            runs on your local data.
          </SmallFeature>
        </div>
        <div className={`${classes.ownYourDataSection} ${classes.container}`}>
          <h3 className="serif-header">Own your data</h3>
          <div className={classes.ownYourDataContent}>
            {icons.shieldLock}
            <div>
              Actual allows you to effortlessly sync changes by running your own
              server. Access updates from anywhere with peace of mind. For those
              seeking next-level security, our optional end-to-end encryption
              ensures your data remains unreadable, even to the server.
            </div>
          </div>
        </div>

        <p
          className={classes.container}
          style={{ maxWidth: 500, marginTop: '12em', marginBottom: '-12em' }}
        >
          <small style={{ opacity: 0.6 }}>
            * PikaPods donates 20% of fees people like you pay to run Actual on
            their servers to{' '}
            <a
              style={{ color: 'inherit', textDecoration: 'underline' }}
              href="https://opencollective.com/actual"
            >
              our Open Collective
            </a>
            . Regardless of this relationship, we believe PikaPods is the
            easiest way to get started with Actual.
          </small>
        </p>
      </div>
    </Layout>
  );
}

function SmallFeature({ title, icon, learnMore, children }) {
  return (
    <div className={classes.smallFeature}>
      <div className={classes.smallFeatureIcon}>{icon}</div>
      <div className={classes.smallFeatureContent}>
        <h3 className={classes.smallFeatureTitle}>{title}</h3>
        <p className={classes.smallFeatureText}>
          {children}{' '}
          {learnMore ? <Link to={learnMore}>Learn&nbsp;more</Link> : null}
        </p>
      </div>
    </div>
  );
}

function MediumFeature({ title, media, src, flip, children }) {
  return (
    <div
      className={`${classes.mediumFeature} ${
        flip ? classes.mediumFeature_flip : ''
      }`}
    >
      <div className={classes.mediumFeatureContent}>
        <h2 className="serif-header">{title}</h2>
        {children}
      </div>
      {media ? (
        <div className={classes.mediumFeatureMedia}>{media}</div>
      ) : (
        <img src={src} alt="" className={classes.mediumFeatureMedia} />
      )}
    </div>
  );
}

function BigFeature({ title, media, srcLight, srcDark = null, children }) {
  const imgDark = srcDark ? srcDark : srcLight;
  return (
    <div className={classes.bigFeature}>
      <h2 className="serif-header">{title}</h2>
      <div className={classes.bigFeatureContent}>{children}</div>
      {media ? (
        <div className={classes.bigFeatureMedia}>{media}</div>
      ) : (
        <ThemedImage
          alt=""
          className={classes.bigFeatureMedia}
          sources={{
            light: srcLight,
            dark: imgDark,
          }}
        />
      )}
    </div>
  );
}

const icons = {
  smileyBlessedAlternate: (
    <svg viewBox="0 0 24 24">
      <path d="M12,0A12,12,0,1,0,24,12,12.013,12.013,0,0,0,12,0Zm0,22A10,10,0,1,1,22,12,10.011,10.011,0,0,1,12,22Z" />
      <path d="M16.561,14.5H7.438a.432.432,0,0,0-.379.25.557.557,0,0,0,0,.5A5.62,5.62,0,0,0,12,18.5a5.622,5.622,0,0,0,4.941-3.25.557.557,0,0,0,0-.5A.431.431,0,0,0,16.561,14.5Z" />
      <path d="M10.916,8.9a1,1,0,0,0-1.832-.8,1.5,1.5,0,0,1-2.751,0A1,1,0,0,0,4.5,8.9a3.5,3.5,0,0,0,6.415,0Z" />
      <path d="M18.983,7.584a1,1,0,0,0-1.316.516,1.5,1.5,0,0,1-2.751,0,1,1,0,1,0-1.832.8,3.5,3.5,0,0,0,6.415,0A1,1,0,0,0,18.983,7.584Z" />
    </svg>
  ),
  synchronizeArrows1: (
    <svg viewBox="0 0 24 24">
      <path d="M10.319,4.936a7.239,7.239,0,0,1,7.1,2.252,1.25,1.25,0,1,0,1.872-1.657A9.737,9.737,0,0,0,9.743,2.5,10.269,10.269,0,0,0,2.378,9.61a.249.249,0,0,1-.271.178l-1.033-.13A.491.491,0,0,0,.6,9.877a.5.5,0,0,0-.019.526l2.476,4.342a.5.5,0,0,0,.373.248.43.43,0,0,0,.062,0,.5.5,0,0,0,.359-.152l3.477-3.593a.5.5,0,0,0-.3-.844L5.15,10.172a.25.25,0,0,1-.2-.333A7.7,7.7,0,0,1,10.319,4.936Z" />
      <path d="M23.406,14.1a.5.5,0,0,0,.015-.526l-2.5-4.329A.5.5,0,0,0,20.546,9a.489.489,0,0,0-.421.151l-3.456,3.614a.5.5,0,0,0,.3.842l1.848.221a.249.249,0,0,1,.183.117.253.253,0,0,1,.023.216,7.688,7.688,0,0,1-5.369,4.9,7.243,7.243,0,0,1-7.1-2.253,1.25,1.25,0,1,0-1.872,1.656,9.74,9.74,0,0,0,9.549,3.03,10.261,10.261,0,0,0,7.369-7.12.251.251,0,0,1,.27-.179l1.058.127a.422.422,0,0,0,.06,0A.5.5,0,0,0,23.406,14.1Z" />
    </svg>
  ),
  shopCashierWoman: (
    <svg viewBox="0 0 24 24">
      <path d="M6.359,10.442a1,1,0,0,0,1.382-.3A5.6,5.6,0,0,0,8.2,9.273a.249.249,0,0,1,.407-.08,4.8,4.8,0,0,0,6.788,0,.249.249,0,0,1,.407.08,5.6,5.6,0,0,0,.458.872A1,1,0,0,0,17.938,9.06,4.576,4.576,0,0,1,17.3,6.548V5.3A5.3,5.3,0,1,0,6.7,5.3V6.548A4.576,4.576,0,0,1,6.062,9.06,1,1,0,0,0,6.359,10.442ZM12,8.6A2.787,2.787,0,0,1,9.212,5.938V5.926a.157.157,0,0,1,.112-.159,5.7,5.7,0,0,0,2.5-1.531A.254.254,0,0,1,12,4.159a.249.249,0,0,1,.181.078,5.726,5.726,0,0,0,2.5,1.531.156.156,0,0,1,.111.159v.011A2.787,2.787,0,0,1,12,8.6Z" />
      <path d="M5.489,17H18.511a.75.75,0,0,0,.7-1.02,7.713,7.713,0,0,0-14.422,0,.75.75,0,0,0,.7,1.02Z" />
      <path d="M23,18H1a1,1,0,0,0,0,2h.25a.25.25,0,0,1,.25.25V23a1,1,0,0,0,1,1h19a1,1,0,0,0,1-1V20.25a.25.25,0,0,1,.25-.25H23a1,1,0,0,0,0-2Z" />
    </svg>
  ),
  diagramSplitVertical: (
    <svg viewBox="0 0 24 24">
      <path d="M23.576,3.3,20.7.422A1.44,1.44,0,0,0,18.24,1.44V2.63a.25.25,0,0,1-.25.25h-.05A7.359,7.359,0,0,0,12.2,5.646a.249.249,0,0,1-.39,0A7.359,7.359,0,0,0,6.06,2.88H6.01a.25.25,0,0,1-.25-.25V1.44A1.44,1.44,0,0,0,3.3.422L.424,3.3a1.439,1.439,0,0,0,0,2.04L3.3,8.218A1.439,1.439,0,0,0,5.76,7.2V6.01a.25.25,0,0,1,.25-.25h.05a4.506,4.506,0,0,1,4.5,4.5v12.3a1.44,1.44,0,0,0,2.88,0v-12.3a4.506,4.506,0,0,1,4.5-4.5h.05a.25.25,0,0,1,.25.25V7.2A1.44,1.44,0,0,0,20.7,8.218L23.576,5.34a1.439,1.439,0,0,0,0-2.04Z" />
    </svg>
  ),
  wallet: (
    <svg viewBox="0 0 20 20">
      <path d="M0 4c0-1.1.9-2 2-2h15a1 1 0 0 1 1 1v1H2v1h17a1 1 0 0 1 1 1v10a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm16.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
    </svg>
  ),
  dataTransferHorizontal: (
    <svg viewBox="0 0 24 24">
      <path d="M6,10.231a1,1,0,0,0,1-1V7.981a.25.25,0,0,1,.25-.25H17.358a1.5,1.5,0,0,0,0-3H7.25A.25.25,0,0,1,7,4.481V3.231a1,1,0,0,0-1.515-.857l-5,3a1,1,0,0,0,0,1.715l5,3A1,1,0,0,0,6,10.231Z" />
      <path d="M23.515,16.911l-5-3A1,1,0,0,0,17,14.769v1.25a.25.25,0,0,1-.25.25H6.642a1.5,1.5,0,1,0,0,3H16.75a.249.249,0,0,1,.25.25v1.25a1,1,0,0,0,1.515.857l5-3a1,1,0,0,0,0-1.715Z" />
    </svg>
  ),
  commonFileDownload: (
    <svg viewBox="0 0 24 24">
      <path d="M23.414,3,21,.586A2,2,0,0,0,19.585,0H8A2,2,0,0,0,6,2V9.275a.248.248,0,0,0,.242.25c.366.006,1.038.033,1.485.083A.246.246,0,0,0,8,9.36V2.5A.5.5,0,0,1,8.5,2H19.379a.5.5,0,0,1,.353.146l2.122,2.122A.5.5,0,0,1,22,4.621V18a.5.5,0,0,1-.5.5H14.642a.245.245,0,0,0-.241.21,7.956,7.956,0,0,1-.364,1.458.244.244,0,0,0,.228.331H22a2,2,0,0,0,2-2V4.414A2,2,0,0,0,23.414,3Z" />
      <path d="M6.5,11A6.5,6.5,0,1,0,13,17.5,6.508,6.508,0,0,0,6.5,11Zm2.391,7.312-2,2.5a.5.5,0,0,1-.782,0l-2-2.5A.5.5,0,0,1,4.5,17.5h.875a.126.126,0,0,0,.125-.124V14.5a1,1,0,0,1,2,0v2.875a.125.125,0,0,0,.124.125H8.5a.5.5,0,0,1,.391.812Z" />
    </svg>
  ),
  rotateBack: (
    <svg viewBox="0 0 24 24">
      <path d="M11.919,4a.243.243,0,0,1-.172-.414l1.879-1.879A1,1,0,1,0,12.212.293l-4,4a1,1,0,0,0,0,1.416l4,4a1,1,0,1,0,1.414-1.414L11.747,6.414A.243.243,0,0,1,11.919,6a8,8,0,0,1,0,16,1,1,0,1,0,0,2,10,10,0,0,0,0-20Z" />
      <path d="M8.827,21.381A8.008,8.008,0,0,1,7.1,20.39a1,1,0,0,0-1.206,1.6,10.036,10.036,0,0,0,2.156,1.24,1,1,0,0,0,.773-1.845Z" />
      <path d="M4.063,15.523a1,1,0,1,0-1.963.382,10.079,10.079,0,0,0,.844,2.507,1,1,0,0,0,1.8-.883A7.961,7.961,0,0,1,4.063,15.523Z" />
      <path d="M4.438,8.891a1,1,0,0,0-1.352.415,10.019,10.019,0,0,0-.939,2.573A1,1,0,0,0,4.1,12.3a8.012,8.012,0,0,1,.752-2.062A1,1,0,0,0,4.438,8.891Z" />
    </svg>
  ),
  realEstateTruckHouse: (
    <svg viewBox="0 0 24 24">
      <path d="M23.832,7.126,16.664.752h0a1,1,0,0,0-1.327,0L8.168,7.126A.5.5,0,0,0,8.5,8h2a.5.5,0,0,1,.5.5v5a1,1,0,0,0,1,1h2a.5.5,0,0,0,.5-.5V11.5a1.5,1.5,0,0,1,3,0V14a.5.5,0,0,0,.5.5h2a1,1,0,0,0,1-1v-5a.5.5,0,0,1,.5-.5h2A.5.5,0,0,0,23.832,7.126Z" />
      <path d="M23,16a.5.5,0,0,0-.5-.5h-12a.5.5,0,0,0-.5.5v2a.5.5,0,0,0,.5.5H21a.5.5,0,0,1,.5.5v.75a.75.75,0,0,0,1.5,0V16Z" />
      <path d="M8,11.5H4.877a1,1,0,0,0-.962.726L3.14,14.94a.5.5,0,0,1-.257.31L.552,16.414A1,1,0,0,0,0,17.309V21.5a1,1,0,0,0,1,1H2.535a.5.5,0,0,0,.5-.57A3,3,0,0,1,8.143,19.4.5.5,0,0,0,9,19.053V12.5A1,1,0,0,0,8,11.5Z" />
      <circle cx="6" cy="21.5" r="2" />
      <path d="M10.5,19.5a.5.5,0,0,0-.5.5v2a.5.5,0,0,0,.5.5h4.539a.5.5,0,0,0,.5-.579,2.884,2.884,0,0,1,.261-1.7.5.5,0,0,0-.45-.718Z" />
      <circle cx="18.5" cy="21.5" r="2" />
    </svg>
  ),
  hierarchy1: (
    <svg viewBox="0 0 24 24">
      <path d="M21,0a3,3,0,0,0-3,3,2.971,2.971,0,0,0,.876,2.1.25.25,0,0,1,.05.279l-2.7,5.979a.25.25,0,0,1-.233.147,2.9,2.9,0,0,0-1.945.726.251.251,0,0,1-.276.035l-2.651-1.327a.249.249,0,0,1-.138-.244A2.993,2.993,0,1,0,5.8,12.531a.251.251,0,0,1,.04.281L3.328,17.875a.25.25,0,0,1-.235.139A2.993,2.993,0,1,0,6,21a2.978,2.978,0,0,0-.8-2.032.251.251,0,0,1-.04-.281l2.513-5.064a.25.25,0,0,1,.234-.139,2.9,2.9,0,0,0,2.049-.716.25.25,0,0,1,.275-.035l2.652,1.326a.251.251,0,0,1,.138.244,2.993,2.993,0,1,0,5.98.2,2.969,2.969,0,0,0-.876-2.1.251.251,0,0,1-.05-.28l2.7-5.983a.252.252,0,0,1,.23-.147A2.995,2.995,0,1,0,21,0Z" />
    </svg>
  ),
  shieldLock: (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="11.994" r="1.5" />
      <path d="M12,4.744a1.752,1.752,0,0,0-1.75,1.75v1.25a.5.5,0,0,0,.5.5h2.5a.5.5,0,0,0,.5-.5V6.494A1.752,1.752,0,0,0,12,4.744Z" />
      <path d="M24,1.953A1.959,1.959,0,0,0,22.043.006H1.959A1.958,1.958,0,0,0,.012,1.965L0,9.306A15.146,15.146,0,0,0,11.861,23.975a1,1,0,0,0,.4,0A15.145,15.145,0,0,0,23.988,9.2ZM17,14.744a1,1,0,0,1-1,1H8a1,1,0,0,1-1-1v-5.5a1,1,0,0,1,1-1h.25a.5.5,0,0,0,.5-.5V6.494a3.25,3.25,0,0,1,6.5,0v1.25a.5.5,0,0,0,.5.5H16a1,1,0,0,1,1,1Z" />
    </svg>
  ),
  play: (
    <svg viewBox="0 0 20 20">
      <path d="m4 4 12 6-12 6z" fill="currentColor" />
    </svg>
  ),
  bank: (
    <svg viewBox="0 0 24 24">
      <path d="M10.8321 1.24802C11.5779 0.917327 12.4221 0.917327 13.1679 1.24802L21.7995 5.0754C23.7751 5.95141 23.1703 9 21.0209 9H2.97906C0.829669 9 0.224891 5.9514 2.20047 5.0754L10.8321 1.24802ZM12.3893 3.12765C12.1407 3.01742 11.8593 3.01742 11.6107 3.12765L3.41076 6.76352C3.31198 6.80732 3.34324 6.95494 3.45129 6.95494H20.5487C20.6568 6.95494 20.688 6.80732 20.5892 6.76352L12.3893 3.12765Z" />
      <path d="M2 22C2 21.4477 2.44772 21 3 21H21C21.5523 21 22 21.4477 22 22C22 22.5523 21.5523 23 21 23H3C2.44772 23 2 22.5523 2 22Z" />
      <path d="M11 19C11 19.5523 11.4477 20 12 20C12.5523 20 13 19.5523 13 19V11C13 10.4477 12.5523 10 12 10C11.4477 10 11 10.4477 11 11V19Z" />
      <path d="M6 20C5.44772 20 5 19.5523 5 19L5 11C5 10.4477 5.44771 10 6 10C6.55228 10 7 10.4477 7 11L7 19C7 19.5523 6.55229 20 6 20Z" />
      <path d="M17 19C17 19.5523 17.4477 20 18 20C18.5523 20 19 19.5523 19 19V11C19 10.4477 18.5523 10 18 10C17.4477 10 17 10.4477 17 11V19Z" />
    </svg>
  ),
  moon: (
    <svg viewBox="0 0 24 24">
      <path d="M21.0672 11.8568L20.4253 11.469L21.0672 11.8568ZM12.1432 2.93276L11.7553 2.29085V2.29085L12.1432 2.93276ZM21.25 12C21.25 17.1086 17.1086 21.25 12 21.25V22.75C17.9371 22.75 22.75 17.9371 22.75 12H21.25ZM12 21.25C6.89137 21.25 2.75 17.1086 2.75 12H1.25C1.25 17.9371 6.06294 22.75 12 22.75V21.25ZM2.75 12C2.75 6.89137 6.89137 2.75 12 2.75V1.25C6.06294 1.25 1.25 6.06294 1.25 12H2.75ZM15.5 14.25C12.3244 14.25 9.75 11.6756 9.75 8.5H8.25C8.25 12.5041 11.4959 15.75 15.5 15.75V14.25ZM20.4253 11.469C19.4172 13.1373 17.5882 14.25 15.5 14.25V15.75C18.1349 15.75 20.4407 14.3439 21.7092 12.2447L20.4253 11.469ZM9.75 8.5C9.75 6.41182 10.8627 4.5828 12.531 3.57467L11.7553 2.29085C9.65609 3.5593 8.25 5.86509 8.25 8.5H9.75ZM12 2.75C11.9115 2.75 11.8077 2.71008 11.7324 2.63168C11.6686 2.56527 11.6538 2.50244 11.6503 2.47703C11.6461 2.44587 11.6482 2.35557 11.7553 2.29085L12.531 3.57467C13.0342 3.27065 13.196 2.71398 13.1368 2.27627C13.0754 1.82126 12.7166 1.25 12 1.25V2.75ZM21.7092 12.2447C21.6444 12.3518 21.5541 12.3539 21.523 12.3497C21.4976 12.3462 21.4347 12.3314 21.3683 12.2676C21.2899 12.1923 21.25 12.0885 21.25 12H22.75C22.75 11.2834 22.1787 10.9246 21.7237 10.8632C21.286 10.804 20.7293 10.9658 20.4253 11.469L21.7092 12.2447Z" />
    </svg>
  ),
};
