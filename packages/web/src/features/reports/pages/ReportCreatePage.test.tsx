import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReportCreatePage } from "./ReportCreatePage";

describe("ReportCreatePage", () => {
  it("renders mobile-friendly report form", () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <BrowserRouter>
          <ReportCreatePage />
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText("Tạo báo cáo ngày")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Gửi báo cáo" })).toBeTruthy();
  });
});
