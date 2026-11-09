import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import App from "../App";

describe("DEVFORCE Frontend Smoke Tests", () => {
  it("renders the Workforce Mission Control headline", () => {
    render(<App />);
    expect(screen.getByText("Workforce Mission Control")).toBeInTheDocument();
    expect(screen.getByText("XEROVA AI DEVFORCE")).toBeInTheDocument();
  });

  it("renders system architecture navigation items", () => {
    render(<App />);
    expect(screen.getByText("Task DAG")).toBeInTheDocument();
    expect(screen.getByText("Agent Roster")).toBeInTheDocument();
    expect(screen.getByText("Execution Sandboxes")).toBeInTheDocument();
  });
});

