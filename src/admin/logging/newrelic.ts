// NOTE: Using require() to get the cjs version with no "import" statements.
// TODO: Ensure @newrelic/* packages are transpiled to enable import syntax.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Ajax } = require('@newrelic/browser-agent/features/ajax');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { JSErrors } = require('@newrelic/browser-agent/features/jserrors');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { SessionTrace } = require('@newrelic/browser-agent/features/session_trace');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { MicroAgent } = require('@newrelic/browser-agent/loaders/micro-agent');

/**
 * Noop New Relic agent for use in local dev.
 * Derived from [New Relic Browser Agent Base](https://github.com/newrelic/newrelic-browser-agent/blob/main/src/loaders/agent-base.js)
 */
class NoopAgent {
  addPageAction(name, attributes) {
    console.log('NewRelic.addPageAction', name, attributes);
  }

  setPageViewName(name, host) {
    console.log('NewRelic.setPageViewName', name, host);
  }

  setCustomAttribute(name, value, persist) {
    console.log('NewRelic.setCustomAttribute', name, value, persist);
  }

  noticeError(error, customAttributes) {
    console.log('NewRelic.noticeError', error, customAttributes);
  }

  setUserId(value) {
    console.log('NewRelic.setUserId', value);
  }

  setApplicationVersion(value) {
    console.log('NewRelic.setApplicationVersion', value);
  }

  setErrorHandler(callback) {
    console.log('NewRelic.setErrorHandler', callback);
  }

  finished(timeStamp) {
    console.log('NewRelic.finished', timeStamp);
  }

  addRelease(name, id) {
    console.log('NewRelic.addRelease', name, id);
  }

  start(featureNames) {
    console.log('NewRelic.start', featureNames);
  }

  recordReplay() {
    console.log('NewRelic.recordReplay');
  }

  pauseReplay() {
    console.log('NewRelic.pauseReplay');
  }
}

const getOptionsByAppType = () => {
  // Environment variables
  const NR_BAM_URL = process.env.NEW_RELIC_BAM_URL;
  const NR_ACCOUNT_ID = process.env.NEW_RELIC_ACCOUNT_ID;
  const NR_LICENSE_KEY = process.env.NEW_RELIC_LICENSE_KEY;
  const NR_APP_ID = process.env.NR_APP_ID;
  const licenseKey = NR_LICENSE_KEY;
  const accountID = NR_ACCOUNT_ID;
  const trustKey = NR_ACCOUNT_ID;
  const bamUrl = NR_BAM_URL;
  const agentID = NR_APP_ID;
  const applicationID = NR_APP_ID;

  // If we can't create the options object, return.
  if (!licenseKey || !accountID || !trustKey || !bamUrl || !agentID || !applicationID) {
    throw new Error('Cannot initialize New Relic agent without required environment variables.');
  }

  return {
    init: {
      distributed_tracing: {
        enabled: true,
      },
      privacy: {
        cookies_enabled: true,
      },
      ajax: {
        deny_list: [bamUrl],
      },
    },
    info: {
      beacon: bamUrl,
      errorBeacon: bamUrl,
      licenseKey,
      applicationID,
      sa: 1,
    },
    loader_config: {
      accountID,
      trustKey,
      agentID,
      licenseKey,
      applicationID,
    },
  };
};

class NewRelic {
  public agent: typeof MicroAgent;
  private globalStateObj: Window;

  constructor() {
    this.globalStateObj = window;

    try {
      this.init();
    } catch (error) {
      console.error('Error initializing New Relic agent', error);
      throw error;
    }
  }

  destructor() {
    this.globalStateObj.removeEventListener('error', (err) => this.handleGlobalError(err));
    this.globalStateObj.removeEventListener('unhandledrejection', (err) =>
      this.handleGlobalError(err),
    );
  }

  /**
   * Initialize the New Relic agent.
   */
  private init() {
    // If we're calling init() externally and the agent is already initialized, do nothing.
    if (this.agent) {
      return;
    }

    // Initialize an agent that can be used in the content and the service worker.
    this.agent = this.buildNewRelicAgent();

    // Add a version specifier to the agent if we are in the context of the service worker.
    // TODO: Get the release version from the extension to add to the agent in the content script.

    // Create the appropriate listeners for global error capture.
    this.globalStateObj.addEventListener('error', (err) => this.handleGlobalError(err));
    this.globalStateObj.addEventListener('unhandledrejection', (err) =>
      this.handleGlobalError(err),
    );
  }

  private handleGlobalError(error) {
    // eslint-disable-next-line no-console
    console.error('Global error', error);
    this.agent.noticeError(error);

    // Prevent the error from bubbling up to the global state, avoiding
    // errors in the extension manager window. Don't do anything with
    // browser errors because they may not be ours.
  }

  private buildNewRelicAgent() {
    try {
      // NOTE: Cherry picking features here, but we have more options to explore
      // [Agent Features](https://github.com/newrelic/newrelic-browser-agent?tab=readme-ov-file#composing-a-custom-agent-with-selected-feature-modules)
      // BrowserAgent doesn't seem to work in either scenario, but MicroAgent does.
      // TODO: Include any user / session metadata we may have at the agent level so use info is
      // delivered with every report.
      return new MicroAgent(getOptionsByAppType(), {
        features: [Ajax, JSErrors, SessionTrace],
      });
    } catch (error) {
      // Create a noop version of the agent to use if we can't initialize it.
      console.log('Creating noop New Relic agent');
      return new NoopAgent();
    }
  }
}

const { agent } = new NewRelic();
export default agent;
