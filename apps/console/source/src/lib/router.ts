import { useEffect, useState } from "react";

export type Route =
  | { name: "queue" }
  | { name: "review" }
  | { name: "ticket"; id: string }
  | { name: "insights" }
  | { name: "knowledge" }
  | { name: "assistant" }
  | { name: "new" };

function parse(hash: string): Route {
  const path = hash.replace(/^#\/?/, "");
  const [head, arg] = path.split("/");
  switch (head) {
    case "review": return { name: "review" };
    case "ticket": return arg ? { name: "ticket", id: arg } : { name: "queue" };
    case "insights": return { name: "insights" };
    case "knowledge": return { name: "knowledge" };
    case "assistant": return { name: "assistant" };
    case "new": return { name: "new" };
    default: return { name: "queue" };
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));
  useEffect(() => {
    const onHash = () => setRoute(parse(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route;
}

export function go(path: string) {
  window.location.hash = path;
}
