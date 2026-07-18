import React from "react";

const createErrorId = () =>
  globalThis.crypto?.randomUUID?.() || `error-${Date.now().toString(36)}`;

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorId: null };
  }

  static getDerivedStateFromError(error) {
    return { error, errorId: createErrorId() };
  }

  componentDidCatch(error, info) {
    console.error("Application render failed", {
      errorId: this.state.errorId,
      error,
      componentStack: info.componentStack,
    });
  }

  componentDidUpdate(previousProps) {
    if (
      this.state.error &&
      previousProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ error: null, errorId: null });
    }
  }

  retry = () => this.setState({ error: null, errorId: null });

  goHome = () => {
    const base = String(import.meta.env.BASE_URL || "/").replace(/\/$/, "");
    window.location.assign(`${base}/home`);
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main
        role="alert"
        className="mx-auto mt-10 max-w-xl rounded-lg border border-red-800 bg-gray-950 p-6 text-gray-100 shadow-2xl"
      >
        <h1 className="fantasy-font text-2xl font-bold text-red-300">
          The guild ledger encountered an error
        </h1>
        <p className="mt-3 text-sm text-gray-300">
          Your current session has not been intentionally reset. Retry this view or return to
          the guild dashboard.
        </p>
        <p className="mt-2 font-mono text-xs text-gray-500">
          Error reference: {this.state.errorId}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={this.retry}
            className="rounded border border-blue-400 bg-blue-800 px-4 py-2 font-bold text-white"
          >
            Retry view
          </button>
          <button
            type="button"
            onClick={this.goHome}
            className="rounded border border-gray-600 bg-gray-800 px-4 py-2 font-bold text-gray-100"
          >
            Return home
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded border border-gray-700 px-4 py-2 text-gray-300"
          >
            Reload application
          </button>
        </div>
      </main>
    );
  }
}

export default AppErrorBoundary;
