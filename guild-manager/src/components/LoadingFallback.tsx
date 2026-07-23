const LoadingFallback = ({ label = "Loading guild records…" }) => (
  <div
    role="status"
    aria-live="polite"
    className="mx-auto mt-10 max-w-md rounded-lg border border-blue-900 bg-gray-950 p-6 text-center text-blue-100 shadow-xl"
  >
    <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-300 border-t-transparent" />
    <span>{label}</span>
  </div>
);

export default LoadingFallback;
