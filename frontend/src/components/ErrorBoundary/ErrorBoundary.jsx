import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Surface render-time failures in the console for debugging.
    console.error("Render error:", error, info);
  }

  handleReset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-semibold text-red-800">Something went wrong displaying this result.</p>
            <p className="mt-1 text-xs text-red-600">
              Try planning the trip again. If it keeps happening, the response may be in an unexpected format.
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
            >
              Dismiss
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
