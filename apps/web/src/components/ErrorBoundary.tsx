import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center max-w-md px-6">
            <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">!</span>
            </div>
            <h2 className="text-xl font-display font-bold text-gray-800 dark:text-gray-100 mb-2">
              Algo deu errado
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              Ocorreu um erro inesperado. Tente recarregar a pagina.
            </p>
            <Button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
            >
              Recarregar pagina
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
