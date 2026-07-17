import { Component, type ErrorInfo, type ReactNode } from "react";
import "./ErrorBoundary.css";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Ловит необработанные ошибки рендера в поддереве и показывает запасной экран
 * вместо белой страницы. Без него единичный краш (например, доступ к полю
 * возможно-undefined объекта) обрушивал всё дерево. Класс-компонент —
 * единственный способ перехватить ошибку рендера в React.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Оставляем след в консоли для диагностики; чувствительных данных тут нет.
    console.error("Unhandled render error:", error, info.componentStack);
  }

  private handleReload = () => {
    this.setState({ hasError: false });
    window.location.assign("/");
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" role="alert">
          <div className="error-boundary__card">
            <h1 className="error-boundary__title">Что-то пошло не так</h1>
            <p className="error-boundary__text">
              Страница не смогла отрисоваться. Попробуйте вернуться на главную —
              обычно это решает проблему.
            </p>
            <button
              type="button"
              className="error-boundary__button"
              onClick={this.handleReload}
            >
              На главную
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
