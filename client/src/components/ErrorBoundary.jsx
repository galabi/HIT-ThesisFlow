import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
        <AlertTriangle size={40} className="text-destructive opacity-70" />
        <div>
          <h2 className="text-lg font-semibold mb-1">אירעה שגיאה בלתי צפויה</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {this.state.error?.message || 'נסה לרענן את הדף.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            רענן דף
          </button>
        </div>
      </div>
    );
  }
}
