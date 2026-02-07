import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-50 p-4 font-sans">
                    <div className="bg-white p-8 rounded-xl shadow-xl max-w-2xl w-full border border-red-100">
                        <h1 className="text-2xl font-bold text-red-600 mb-4">Algo deu errado</h1>
                        <p className="text-slate-600 mb-6">
                            Ocorreu um erro inesperado na aplicação. Por favor, tente recarregar a página.
                        </p>

                        <div className="bg-slate-900 rounded-lg p-4 overflow-auto max-h-96 custom-scrollbar mb-6">
                            <p className="text-red-400 font-mono text-sm mb-2 font-bold">
                                {this.state.error && this.state.error.toString()}
                            </p>
                            <pre className="text-slate-300 font-mono text-xs">
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
                            >
                                Recarregar Página
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                                Voltar ao Início
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
