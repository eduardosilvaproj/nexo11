// ============================================
// ErrorBoundary — Mostra erros de runtime
// ============================================

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  info: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("[ErrorBoundary]", error, errorInfo);
    this.setState({
      info: errorInfo?.componentStack || null,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "#0a0e1a",
          color: "white",
          padding: 24,
          fontFamily: "monospace",
          overflow: "auto",
          zIndex: 9999,
        }}>
          <h1 style={{ color: "#f87171", fontSize: 20, marginBottom: 16 }}>
            ⚠️ Erro de Runtime
          </h1>
          <p style={{ color: "#94a3b8", marginBottom: 16 }}>
            A aplicação quebrou. Detalhes abaixo:
          </p>
          <pre style={{
            background: "#1e293b",
            padding: 16,
            borderRadius: 8,
            color: "#fbbf24",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontSize: 12,
          }}>
            {this.state.error?.name}: {this.state.error?.message}
            {"\n\n"}
            {this.state.error?.stack}
          </pre>
          {this.state.info && (
            <details style={{ marginTop: 16 }}>
              <summary style={{ cursor: "pointer", color: "#94a3b8" }}>
                Component Stack
              </summary>
              <pre style={{
                background: "#1e293b",
                padding: 16,
                borderRadius: 8,
                color: "#94a3b8",
                whiteSpace: "pre-wrap",
                fontSize: 10,
                marginTop: 8,
              }}>
                {this.state.info}
              </pre>
            </details>
          )}
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            style={{
              marginTop: 16,
              padding: "8px 16px",
              background: "#1a9be8",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Limpar cache e recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
