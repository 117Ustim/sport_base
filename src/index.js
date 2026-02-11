import React from "react";
import ReactDOM from "react-dom/client";
import "./index.scss";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { createStore } from "redux";
import rootReducer from "./store/indexRedux";
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";
// Импорт конфига i18n
import './i18n';
// Инициализация Sentry
import { initSentry } from './utils/sentry';

// Инициализируем Sentry перед рендером приложения
initSentry();

const root = ReactDOM.createRoot(document.getElementById("root"));
const store = createStore(rootReducer);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Provider store={store}>
          <App />
        </Provider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
