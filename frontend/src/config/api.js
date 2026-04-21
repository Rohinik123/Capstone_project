/** Base URL for REST API and Socket.IO (no trailing slash). */
const PROD_API = "https://capstone-server-0dtj.onrender.com";

export const API_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:8001"
    : PROD_API);
