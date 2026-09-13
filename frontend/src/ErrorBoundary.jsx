import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', backgroundColor: '#fee2e2', color: '#991b1b', height: '100vh', overflow: 'auto' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Algo salió mal.</h1>
          <p style={{ marginTop: '1rem', fontWeight: 'bold' }}>{this.state.error && this.state.error.toString()}</p>
          <pre style={{ marginTop: '1rem', whiteSpace: 'pre-wrap', fontSize: '0.8rem', backgroundColor: '#fecaca', padding: '1rem', borderRadius: '0.5rem' }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
