import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '20px',
                    color: '#fff',
                    backgroundColor: '#050505',
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontFamily: 'monospace'
                }}>
                    <h1 style={{ color: '#C5A059' }}>Something went wrong.</h1>
                    <p>Please report this error to support.</p>
                    <pre style={{
                        marginTop: '20px',
                        padding: '15px',
                        backgroundColor: '#111',
                        borderRadius: '5px',
                        maxWidth: '90vw',
                        overflow: 'auto',
                        textAlign: 'left'
                    }}>
                        {this.state.error && this.state.error.toString()}
                    </pre>
                </div>
            );
        }

        return this.props.children;
    }
}
