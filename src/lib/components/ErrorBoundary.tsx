import React, { Component } from 'react';

interface Props {
  children?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleResetCache = () => {
    localStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-slate-100 font-sans">
          <div className="max-w-2xl w-full bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl p-8 space-y-6">
            <div className="flex items-center space-x-3 text-rose-500">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="text-xl font-bold tracking-tight">Terjadi Kesalahan Sistem (Application Crash)</h2>
            </div>
            
            <p className="text-sm text-slate-300 leading-relaxed">
              SAPA pegawai UPT Puskesmas Sedau mendeteksi adanya error runtime atau kegagalan inisialisasi pada browser Anda.
              Hal ini biasanya terjadi karena data cache <code className="bg-slate-950 px-1.5 py-0.5 rounded text-rose-400 text-xs">localStorage</code> yang tidak sinkron, atau kegagalan parsing state.
            </p>

            <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 font-mono text-xs text-rose-400 overflow-auto max-h-48 space-y-2">
              <p className="font-bold">Error Message:</p>
              <p className="font-sans font-bold text-white mb-2">{this.state.error?.toString()}</p>
              {this.state.errorInfo && (
                <div className="mt-2 text-slate-400 text-[10px] leading-normal whitespace-pre-wrap text-left bg-slate-900/50 p-2 rounded">
                  {this.state.errorInfo.componentStack || String(this.state.errorInfo)}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 border border-slate-600/50 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
              >
                Muat Ulang Halaman (Reload)
              </button>
              <button
                type="button"
                onClick={this.handleResetCache}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 border border-rose-500/50 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
              >
                Reset Cache & Muat Ulang (Clear Cache)
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
