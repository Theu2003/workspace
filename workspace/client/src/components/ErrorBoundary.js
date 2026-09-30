// Titulo: ErrorBoundary
// Autor: Mateus Martins Peres
// Finalidade: Componente React responsavel por ErrorBoundary.
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {

    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#faf8f5] px-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-lg p-8 max-w-md w-full text-center">
            <span className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto text-xl font-bold">
              !
            </span>
            <h1 className="mt-4 text-lg font-bold text-stone-800">Algo deu errado</h1>
            <p className="mt-1.5 text-sm text-stone-500">
              Ocorreu um erro inesperado ao renderizar esta tela. Tente recarregar a página.
            </p>
            {import.meta.env.DEV && (
              <pre className="mt-4 text-left text-[11px] bg-stone-50 border border-stone-200 rounded-lg p-3 overflow-auto max-h-40 text-stone-600 whitespace-pre-wrap">
                {String(this.state.error?.message || this.state.error)}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-5 px-5 py-2 rounded-lg bg-[#4a6741] text-white text-sm font-semibold hover:bg-[#364a25] transition-colors"
            >
              Recarregar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
