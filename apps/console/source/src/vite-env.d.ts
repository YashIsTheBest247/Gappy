/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LEMMA_POD_ID?: string;
  readonly VITE_LEMMA_API_URL?: string;
  readonly VITE_LEMMA_AUTH_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
