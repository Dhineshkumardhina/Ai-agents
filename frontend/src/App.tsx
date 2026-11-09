import React from "react";
import { BrowserRouter } from "react-router-dom";
import { AppProviders } from "./app/providers";
import { AppRoutes } from "./app/routes";

export const App: React.FC = () => {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  );
};

export default App;

