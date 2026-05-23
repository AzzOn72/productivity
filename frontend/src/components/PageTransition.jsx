import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * Page transition wrapper — soft fade-up on route change.
 * Avoids cross-fade flicker by keying on pathname.
 */
export default function PageTransition({ children }) {
  const location = useLocation();
  const [key, setKey] = useState(location.pathname);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setKey(location.pathname + "@" + Date.now());
  }, [location.pathname]);

  return (
    <div key={key} className="velari-page-enter" data-testid="page-transition">
      {children}
    </div>
  );
}
