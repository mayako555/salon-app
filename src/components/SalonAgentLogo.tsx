/** Original brand artwork, framed to remove its surrounding white space. */
export default function SalonAgentLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="50 836 1910 344"
      role="img"
      aria-label="SALON AGENT サロン経営のAI秘書"
      className={`block bg-white rounded-sm ${className}`}
    >
      <image href="/branding/salon-agent-logo.png" width="2000" height="2000" />
    </svg>
  );
}
