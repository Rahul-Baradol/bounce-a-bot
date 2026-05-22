import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./pages/home";
import AnalyticsPage from "./pages/analytics";

export default function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
      </Routes>
    </BrowserRouter>
  );
}